// src/models/Credential.ts
import mongoose, { Schema, Document } from 'mongoose';

export interface ICredential extends Document {
  holderId: string;
  title: string;
  claims: Record<string, any>;
  claimsHash: string; // SHA256 of claims
  commitments: Array<{
    field: string;
    hash: string;
    salt: string;
  }>;
  merkleRoot: string;
  merkleTree: string[][]; // Full merkle tree for verification
  issuerName: string;
  issuerPublicKey: string;
  issuerSignature: string; // Signature of merkleRoot
  issuedAt: Date;
  expiresAt?: Date;
  shareTokens: Array<{
    token: string;
    selectedFields: string[];
    presentationToken: string;
    expiresAt?: Date;
    createdAt: Date;
    viewCount: number;
    lastViewedAt?: Date;
  }>;
  revoked: boolean;
  revokedAt?: Date;
  revokeReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const CredentialSchema = new Schema<ICredential>(
  {
    holderId: { type: String, required: true, index: true },
    title: { type: String, required: true },
    claims: { type: Schema.Types.Mixed, required: true },
    claimsHash: { type: String, required: true, index: true },
    commitments: [
      {
        field: String,
        hash: String,
        salt: String,
      },
    ],
    merkleRoot: { type: String, required: true, index: true },
    merkleTree: [[String]],
    issuerName: { type: String, required: true },
    issuerPublicKey: { type: String, required: true },
    issuerSignature: { type: String, required: true },
    issuedAt: { type: Date, required: true },
    expiresAt: Date,
    shareTokens: [
      {
        token: { type: String, required: true },
        selectedFields: [String],
        presentationToken: String,
        expiresAt: Date,
        createdAt: { type: Date, default: () => new Date() },
        viewCount: { type: Number, default: 0 },
        lastViewedAt: Date,
      },
    ],
    revoked: { type: Boolean, default: false, index: true },
    revokedAt: Date,
    revokeReason: String,
  },
  { timestamps: true }
);

// Prevent model re-registration during Next.js hot reload
export default mongoose.models.Credential || mongoose.model<ICredential>('Credential', CredentialSchema);