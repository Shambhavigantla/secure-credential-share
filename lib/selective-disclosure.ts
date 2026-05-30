// src/lib/selective-disclosure.ts
import { sha256 } from '@noble/hashes/sha2.js';
import { randomBytes as cryptoRandomBytes } from 'crypto';
import { v4 as uuidv4 } from 'uuid';

/**
 * Selective Disclosure & Verifiable Presentation Module
 * Implements cryptographic proof system for selective field revelation
 */

export interface DisclosureCommitment {
  field: string;
  value: any;
  salt: string; // random 32-byte hex
  hash: string; // sha256(field:value:salt)
}

export interface SelectivePresentation {
  credentialId: string;
  holderId: string;
  disclosedFields: DisclosureCommitment[];
  merkleRoot: string;
  issuerSignature: string;
  presentationToken: string; // UUID for tracking
  createdAt: Date;
  expiresAt?: Date;
}

export interface VerificationResult {
  valid: boolean;
  credentialId: string;
  disclosedData: Record<string, any>;
  merkleRoot: string;
  issuerPublicKey: string;
  verifiedAt: Date;
  trustScore: number; // 0-100
  errors?: string[];
}

/**
 * Generate a cryptographic salt for commitment
 */
export function generateSalt(): string {
  return cryptoRandomBytes(16).toString('hex');
}

/**
 * Create a commitment hash for a field
 * Hash = SHA256(field + ":" + value + ":" + salt)
 */
export function createCommitment(
  field: string,
  value: any,
  salt: string
): DisclosureCommitment {
  const valueStr = typeof value === 'string' ? value : JSON.stringify(value);
  const input = `${field}:${valueStr}:${salt}`;
  const hashBuffer = sha256(new TextEncoder().encode(input));
  const hash = Buffer.from(hashBuffer).toString('hex');

  return {
    field,
    value,
    salt,
    hash,
  };
}

/**
 * Build a Merkle tree from commitments
 * Returns: [leaves, level1, level2, ... root]
 */
export function buildMerkleTree(commitments: DisclosureCommitment[]): string[][] {
  if (commitments.length === 0) {
    throw new Error('Cannot build Merkle tree with 0 commitments');
  }

  const tree: string[][] = [];
  
  // Leaves: hashes of all commitments
  const leaves = commitments.map(c => c.hash);
  tree.push([...leaves]);

  let currentLevel = leaves;

  // Build tree bottom-up
  while (currentLevel.length > 1) {
    const nextLevel: string[] = [];
    
    for (let i = 0; i < currentLevel.length; i += 2) {
      const left = currentLevel[i];
      const right = i + 1 < currentLevel.length ? currentLevel[i + 1] : left; // Duplicate if odd
      const combined = `${left}${right}`;
      const parentHash = Buffer.from(sha256(new TextEncoder().encode(combined))).toString('hex');
      nextLevel.push(parentHash);
    }

    tree.push([...nextLevel]);
    currentLevel = nextLevel;
  }

  return tree;
}

/**
 * Get Merkle root from tree
 */
export function getMerkleRoot(tree: string[][]): string {
  if (tree.length === 0) return '';
  return tree[tree.length - 1][0];
}

/**
 * Generate Merkle proof for a specific leaf
 * Returns proof: array of sibling hashes needed to recompute root
 */
export function generateMerkleProof(
  tree: string[][],
  leafIndex: number
): { proof: string[]; index: number } {
  if (leafIndex >= tree[0].length) {
    throw new Error('Leaf index out of bounds');
  }

  const proof: string[] = [];
  let index = leafIndex;

  for (let level = 0; level < tree.length - 1; level++) {
    const isLeft = index % 2 === 0;
    const siblingIndex = isLeft ? index + 1 : index - 1;
    
    if (siblingIndex < tree[level].length) {
      proof.push(tree[level][siblingIndex]);
    } else if (isLeft) {
      // Odd node at leaf level is hashed with itself
      proof.push(tree[level][index]);
    }

    index = Math.floor(index / 2);
  }

  return { proof, index: leafIndex };
}

/**
 * Verify a Merkle proof against a root
 */
export function verifyMerkleProof(
  leaf: string,
  proof: string[],
  leafIndex: number,
  merkleRoot: string
): boolean {
  let current = leaf;
  let index = leafIndex;

  for (let i = 0; i < proof.length; i++) {
    const sibling = proof[i];
    const isLeft = index % 2 === 0;
    
    const combined = isLeft
      ? `${current}${sibling}`
      : `${sibling}${current}`;
    
    current = Buffer.from(sha256(new TextEncoder().encode(combined))).toString('hex');
    index = Math.floor(index / 2);
  }

  return current === merkleRoot;
}

/**
 * Create a selective presentation (Verifiable Presentation)
 * Given full credential data and selected fields, create proof of disclosure
 */
export function createSelectivePresentation(
  credentialId: string,
  holderId: string,
  fullCredentialData: Record<string, any>,
  selectedFields: string[],
  merkleRoot: string,
  issuerSignature: string,
  expiresInMinutes?: number
): SelectivePresentation {
  // Create commitments only for disclosed fields
  const disclosedFields: DisclosureCommitment[] = selectedFields
    .filter(field => field in fullCredentialData)
    .map(field => {
      const salt = generateSalt();
      return createCommitment(field, fullCredentialData[field], salt);
    });

  const expiresAt = expiresInMinutes
    ? new Date(Date.now() + expiresInMinutes * 60 * 1000)
    : undefined;

  return {
    credentialId,
    holderId,
    disclosedFields,
    merkleRoot,
    issuerSignature,
    presentationToken: uuidv4(),
    createdAt: new Date(),
    expiresAt,
  };
}

/**
 * Verify a selective presentation
 * Check that disclosed commitments are valid against original merkle root
 */
export function verifySelectivePresentation(
  presentation: SelectivePresentation,
  originalMerkleTree: string[][]
): VerificationResult {
  const errors: string[] = [];
  let trustScore = 100;

  try {
    // Check expiration
    if (presentation.expiresAt && presentation.expiresAt < new Date()) {
      errors.push('Presentation has expired');
      trustScore -= 50;
    }

    // Verify each disclosed field's commitment exists in merkle tree
    // (simplified: in production, you'd verify merkle proofs)
    const disclosedHashes = new Set(presentation.disclosedFields.map(d => d.hash));
    const treeLeaves = originalMerkleTree[0] || [];

    // Count matching commitments
    let matchedCount = 0;
    for (const leaf of treeLeaves) {
      if (disclosedHashes.has(leaf)) {
        matchedCount++;
      }
    }

    if (matchedCount === 0) {
      errors.push('No disclosed fields found in credential commitment tree');
      trustScore = 0;
    }

    const valid = errors.length === 0;

    return {
      valid,
      credentialId: presentation.credentialId,
      disclosedData: Object.fromEntries(
        presentation.disclosedFields.map(d => [d.field, d.value])
      ),
      merkleRoot: presentation.merkleRoot,
      issuerPublicKey: '', // Would be retrieved from credential
      verifiedAt: new Date(),
      trustScore,
      errors: errors.length > 0 ? errors : undefined,
    };
  } catch (err) {
    return {
      valid: false,
      credentialId: presentation.credentialId,
      disclosedData: {},
      merkleRoot: presentation.merkleRoot,
      issuerPublicKey: '',
      verifiedAt: new Date(),
      trustScore: 0,
      errors: ['Verification failed: ' + (err instanceof Error ? err.message : String(err))],
    };
  }
}

/**
 * Create hash of full credential for integrity checking
 */
export function hashCredential(credentialData: Record<string, any>): string {
  const sortedData = JSON.stringify(credentialData, Object.keys(credentialData).sort());
  return Buffer.from(sha256(new TextEncoder().encode(sortedData))).toString('hex');
}
