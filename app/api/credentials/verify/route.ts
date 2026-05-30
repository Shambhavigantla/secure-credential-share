import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Credential from '@/models/Credential';
import { withRateLimit } from '@/lib/middleware';
import { verifySelectivePresentation, getMerkleRoot } from '@/lib/selective-disclosure';

/**
 * Build field-level trust indicators for each disclosed field
 */
function buildFieldLevelTrust(
  shareRecord: any,
  credential: any,
  disclosedFields: any[]
): Record<string, any> {
  const fieldTrust: Record<string, any> = {};

  disclosedFields.forEach((field) => {
    const originalCommitment = credential.commitments.find(
      (c: any) => c.field === field.field
    );

    // Calculate per-field trust score
    let fieldScore = 100;

    // Check hash integrity
    const hashMatch = originalCommitment?.hash === field.hash;
    if (!hashMatch) fieldScore -= 50;

    // Check salt integrity
    const saltMatch = originalCommitment?.salt === field.salt;
    if (!saltMatch) fieldScore -= 25;

    // Check value integrity
    const valueMatch = JSON.stringify(credential.claims[field.field]) === 
                       JSON.stringify(field.value);
    if (!valueMatch) fieldScore -= 20;

    // Check expiry status
    const isExpired = shareRecord?.expiresAt && new Date() > shareRecord.expiresAt;
    if (isExpired) fieldScore -= 100;

    // Check age of credential (older = slightly lower trust)
    const credentialAge = Date.now() - new Date(credential.issuedAt).getTime();
    const ageInDays = credentialAge / (1000 * 60 * 60 * 24);
    if (ageInDays > 365) fieldScore -= 5;
    if (ageInDays > 730) fieldScore -= 10;

    // Determine trust level
    let trustLevel = 'Unknown';
    if (fieldScore >= 95) trustLevel = 'Critical';
    else if (fieldScore >= 85) trustLevel = 'High';
    else if (fieldScore >= 70) trustLevel = 'Medium';
    else if (fieldScore >= 50) trustLevel = 'Low';
    else trustLevel = 'Failed';

    fieldTrust[field.field] = {
      trustScore: Math.max(0, Math.min(100, fieldScore)),
      trustLevel,
      integrityChecks: {
        hashVerified: hashMatch,
        saltVerified: saltMatch,
        valueVerified: valueMatch,
        notExpired: !isExpired,
        credentialAge: `${Math.floor(ageInDays)} days`,
      },
      dataType: typeof credential.claims[field.field],
      dataSize: JSON.stringify(field.value).length,
      lastModified: credential.updatedAt,
    };
  });

  return fieldTrust;
}


// This endpoint is rate-limited but does NOT require auth (public verification)
async function handler(request: NextRequest) {
  try {
    const body = await request.json();
    const { presentationToken, shareToken } = body;

    if (!presentationToken && !shareToken) {
      return NextResponse.json(
        { error: 'Either presentationToken or shareToken is required' },
        { status: 400 }
      );
    }

    // Connect to DB
    await connectDB();

    // Find credential by share token
    let credential = null;
    let shareRecord = null;

    if (shareToken) {
      credential = await Credential.findOne({
        'shareTokens.token': shareToken,
      });

      if (!credential) {
        return NextResponse.json(
          { error: 'Share token not found or expired' },
          { status: 404 }
        );
      }

      shareRecord = credential.shareTokens.find((t: any) => t.token === shareToken);

      // Check if share token is expired
      if (shareRecord?.expiresAt && new Date() > shareRecord.expiresAt) {
        return NextResponse.json(
          { error: 'Share token has expired' },
          { status: 403 }
        );
      }

      // Increment view count
      if (shareRecord) {
        shareRecord.viewCount = (shareRecord.viewCount || 0) + 1;
        shareRecord.lastViewedAt = new Date();
        await credential.save();
      }
    }

    if (!credential) {
      return NextResponse.json(
        { error: 'Credential not found' },
        { status: 404 }
      );
    }

    // Build presentation from share record
    const presentation = {
      credentialId: credential._id.toString(),
      presentationToken: shareRecord?.presentationToken || presentationToken,
      disclosedFields: credential.commitments
        .filter((c: any) => shareRecord?.selectedFields?.includes(c.field))
        .map((c: any) => ({
          field: c.field,
          value: credential.claims[c.field],
          salt: c.salt,
          hash: c.hash,
        })),
      merkleRoot: credential.merkleRoot,
      issuerSignature: credential.issuerSignature,
      createdAt: shareRecord?.createdAt || new Date(),
      expiresAt: shareRecord?.expiresAt,
    };

    // Verify presentation
    const verificationResult = verifySelectivePresentation(
      presentation as any,
      credential.merkleTree
    );

    // Build field-level trust indicators
    const fieldLevelTrust = buildFieldLevelTrust(
      shareRecord,
      credential,
      presentation.disclosedFields
    );

    // Add comprehensive audit trail
    const result = {
      ...verificationResult,
      issuerName: credential.issuerName,
      issuedAt: credential.issuedAt,
      credentialTitle: credential.title,
      viewCount: shareRecord?.viewCount || 0,
      lastViewedAt: shareRecord?.lastViewedAt,
      fieldLevelTrust,
      auditTrail: {
        verifiedAt: new Date().toISOString(),
        sharingDuration: shareRecord?.expiresAt 
          ? Math.ceil((new Date(shareRecord.expiresAt).getTime() - new Date(shareRecord.createdAt).getTime()) / 1000)
          : null,
        timeRemaining: shareRecord?.expiresAt
          ? Math.max(0, Math.ceil((new Date(shareRecord.expiresAt).getTime() - new Date().getTime()) / 1000))
          : null,
        totalViews: shareRecord?.viewCount || 0,
        issuerName: credential.issuerName,
        issuerPublicKey: credential.issuerPublicKey,
      },
    };

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error('Verification error:', error);
    return NextResponse.json(
      { error: 'Verification failed' },
      { status: 500 }
    );
  }
}

// Apply rate limiting (more restrictive for verification)
export const POST = withRateLimit(
  handler,
  60000, // 1 minute window
  50 // 50 requests per minute
);
