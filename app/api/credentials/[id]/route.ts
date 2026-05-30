import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Credential from '@/models/Credential';
import { verifyToken, extractToken } from '@/lib/middleware';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
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

    // Get credential
    const credential = await Credential.findOne({
      _id: id,
      holderId: payload.userId,
      revoked: false,
    });

    if (!credential) {
      return NextResponse.json(
        { error: 'Credential not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        credential: {
          id: credential._id.toString(),
          title: credential.title,
          claims: credential.claims,
          merkleRoot: credential.merkleRoot,
          issuedAt: credential.issuedAt,
          issuerName: credential.issuerName,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Get credential error:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve credential' },
      { status: 500 }
    );
  }
}
