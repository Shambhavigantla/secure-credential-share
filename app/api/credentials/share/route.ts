import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Credential from '@/models/Credential';
import { shareCredentialSchema, validate, sanitizeObject, type ShareCredentialData } from '@/lib/validation';
import { verifyToken, extractToken } from '@/lib/middleware';
import { createSelectivePresentation, createCommitment } from '@/lib/selective-disclosure';
import { v4 as uuidv4 } from 'uuid';
import QRCode from 'qrcode';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

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
    const validation = validate<ShareCredentialData>(shareCredentialSchema, sanitized);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.errors },
        { status: 400 }
      );
    }

    const { credentialId, selectedFields, expiresInMinutes } = validation.data;

    // Connect to DB
    await connectDB();

    // Get credential
    const credential = await Credential.findOne({
      _id: credentialId,
      holderId: payload.userId,
      revoked: false,
    });

    if (!credential) {
      return NextResponse.json(
        { error: 'Credential not found or access denied' },
        { status: 404 }
      );
    }

    // Verify selected fields exist in credential
    const validFields = Object.keys(credential.claims);
    const invalidFields = selectedFields.filter((f: string) => !validFields.includes(f));
    
    if (invalidFields.length > 0) {
      return NextResponse.json(
        { error: 'Invalid fields selected', details: invalidFields },
        { status: 400 }
      );
    }

    // Create selective presentation
    const presentation = createSelectivePresentation(
      credentialId,
      payload.userId,
      credential.claims,
      selectedFields,
      credential.merkleRoot,
      credential.issuerSignature,
      expiresInMinutes
    );

    // Generate share token
    const shareToken = uuidv4();

    // Generate verifiable link
    const verifiableLink = `${APP_URL}/verify?token=${shareToken}`;

    // Generate QR code
    let qrCode = '';
    try {
      qrCode = await QRCode.toDataURL(verifiableLink);
    } catch (err) {
      console.warn('QR code generation failed:', err);
    }

    // Save share token to credential
    credential.shareTokens.push({
      token: shareToken,
      selectedFields,
      presentationToken: presentation.presentationToken,
      expiresAt: presentation.expiresAt,
      createdAt: new Date(),
      viewCount: 0,
    });

    // Store presentation data in session/cache (in production, use Redis or database)
    // For now, we'll encode it in the response
    const presentationData = {
      credentialId,
      presentationToken: presentation.presentationToken,
      disclosedFields: presentation.disclosedFields,
      merkleRoot: presentation.merkleRoot,
      issuerSignature: presentation.issuerSignature,
      issuerPublicKey: credential.issuerPublicKey,
      issuerName: credential.issuerName,
      createdAt: presentation.createdAt,
      expiresAt: presentation.expiresAt,
    };

    // Save credential
    await credential.save();

    return NextResponse.json(
      {
        success: true,
        shareToken,
        verifiableLink,
        qrCode,
        presentation: presentationData,
        expiresAt: presentation.expiresAt,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Share credential error:', error);
    return NextResponse.json(
      { error: 'Failed to create share link' },
      { status: 500 }
    );
  }
}
