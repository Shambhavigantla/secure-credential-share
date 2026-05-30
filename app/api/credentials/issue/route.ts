import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Credential from '@/models/Credential';
import { issueCredentialSchema, validate, sanitizeObject, type IssueCredentialData } from '@/lib/validation';
import { verifyToken, extractToken } from '@/lib/middleware';
import {
  createCommitment,
  buildMerkleTree,
  getMerkleRoot,
  hashCredential,
} from '@/lib/selective-disclosure';
import * as ed from '@noble/ed25519';

const ISSUER_NAME = process.env.ISSUER_NAME || 'Digital Credential Authority';
const ISSUER_PRIVATE_KEY = process.env.ISSUER_PRIVATE_KEY;
const ISSUER_PUBLIC_KEY = process.env.ISSUER_PUBLIC_KEY;

export async function POST(request: NextRequest) {
  try {
    // Extract and verify token
    const token = extractToken(request);
    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const sanitized = sanitizeObject(body);

    // Validate input
    const validation = validate<IssueCredentialData>(issueCredentialSchema, sanitized);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.errors },
        { status: 400 }
      );
    }

    const { title, claims, expiresInDays } = validation.data;

    // Connect to DB
    await connectDB();

    // Create commitments for each claim
    const commitments = Object.entries(claims).map(([field, value]) => {
      const { salt, hash } = createCommitment(field, value, '');
      return { field, hash, salt };
    });

    // Build Merkle tree
    const merkleTree = buildMerkleTree(
      commitments.map((c: any) => ({
        field: c.field,
        value: claims[c.field],
        salt: c.salt,
        hash: c.hash,
      }))
    );

    const merkleRoot = getMerkleRoot(merkleTree);

    // Sign merkleRoot
    let issuerSignature = '';
    if (ISSUER_PRIVATE_KEY) {
      try {
        const privKeyBuff = Buffer.from(ISSUER_PRIVATE_KEY, 'hex');
        const msg = new TextEncoder().encode(merkleRoot);
        const sig = await ed.signAsync(msg, privKeyBuff);
        issuerSignature = Buffer.from(sig).toString('hex');
      } catch (error) {
        console.warn('Could not sign with issuer key:', error);
        issuerSignature = 'mock-signature-for-demo';
      }
    }

    // Create credential document
    const claimsHash = hashCredential(claims);
    const expiresAt = expiresInDays ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000) : undefined;

    const credential = await Credential.create({
      holderId: payload.userId,
      title,
      claims,
      claimsHash,
      commitments,
      merkleRoot,
      merkleTree,
      issuerName: ISSUER_NAME,
      issuerPublicKey: ISSUER_PUBLIC_KEY || 'mock-public-key',
      issuerSignature,
      issuedAt: new Date(),
      expiresAt,
    });

    return NextResponse.json(
      {
        success: true,
        credential: {
          id: credential._id.toString(),
          title: credential.title,
          merkleRoot: credential.merkleRoot,
          issuedAt: credential.issuedAt,
          expiresAt: credential.expiresAt,
          issuerName: credential.issuerName,
          // Do NOT return claims or merkleTree to frontend for security
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Credential issuance error:', error);
    return NextResponse.json(
      { error: 'Failed to issue credential' },
      { status: 500 }
    );
  }
}
