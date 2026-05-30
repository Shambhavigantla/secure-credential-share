import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Credential from '@/models/Credential';
import { verifyToken, extractToken } from '@/lib/middleware';

export async function GET(request: NextRequest) {
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

    // Connect to DB
    await connectDB();

    // Get user's credentials (do not return full claims or merkle tree)
    const credentials = await Credential.find({
      holderId: payload.userId,
      revoked: false,
    })
      .select('_id title merkleRoot issuedAt expiresAt issuerName shareTokens')
      .sort({ issuedAt: -1 });

    return NextResponse.json(
      {
        success: true,
        credentials: credentials.map((c: any) => ({
          id: c._id.toString(),
          title: c.title,
          merkleRoot: c.merkleRoot,
          issuedAt: c.issuedAt,
          expiresAt: c.expiresAt,
          issuerName: c.issuerName,
          shareCount: c.shareTokens?.length || 0,
        })),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Get credentials error:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve credentials' },
      { status: 500 }
    );
  }
}
