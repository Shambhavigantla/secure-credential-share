import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Credential from '@/models/Credential';
import { withRateLimit } from '@/lib/middleware';
import { verifySelectivePresentation, getMerkleRoot } from '@/lib/selective-disclosure';

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

    // Add additional metadata
    const result = {
      ...verificationResult,
      issuerName: credential.issuerName,
      issuedAt: credential.issuedAt,
      credentialTitle: credential.title,
      viewCount: shareRecord?.viewCount || 0,
      lastViewedAt: shareRecord?.lastViewedAt,
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
