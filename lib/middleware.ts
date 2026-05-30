// src/lib/middleware.ts
import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

export interface JWTPayload {
  userId: string;
  email: string;
  iat: number;
  exp: number;
}

export interface AuthRequest extends NextRequest {
  userId?: string;
  user?: JWTPayload;
}

const JWT_SECRET = process.env.JWT_SECRET;
const RATE_LIMIT_WINDOW_MS = parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000');
const RATE_LIMIT_MAX_REQUESTS = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100');

// In-memory rate limit store (in production, use Redis)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

/**
 * Verify JWT token and extract payload
 */
export function verifyToken(token: string): JWTPayload | null {
  if (!JWT_SECRET) {
    console.error('JWT_SECRET not configured');
    return null;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
    return decoded;
  } catch (error) {
    console.error('Token verification failed:', error);
    return null;
  }
}

/**
 * Extract JWT from request cookie or Authorization header
 */
export function extractToken(request: NextRequest): string | null {
  // Check Authorization header
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }

  // Check cookies
  const token = request.cookies.get('token')?.value;
  return token || null;
}

/**
 * Middleware: Verify JWT authentication
 */
export async function withAuth(
  request: NextRequest,
  handler: (req: AuthRequest) => Promise<NextResponse>
): Promise<NextResponse> {
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

  // Attach user info to request
  const authRequest = request as AuthRequest;
  authRequest.user = payload;
  authRequest.userId = payload.userId;

  return handler(authRequest);
}

/**
 * Middleware: Rate limiting
 */
export function withRateLimit(
  handler: (req: NextRequest) => Promise<NextResponse>,
  windowMs: number = RATE_LIMIT_WINDOW_MS,
  maxRequests: number = RATE_LIMIT_MAX_REQUESTS
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const ip = request.headers.get('x-forwarded-for') || 
               request.headers.get('x-real-ip') || 
               'unknown';
    const key = `${ip}:${request.nextUrl.pathname}`;
    const now = Date.now();

    let record = rateLimitStore.get(key);

    if (!record || now > record.resetTime) {
      // Create new record
      record = {
        count: 1,
        resetTime: now + windowMs,
      };
    } else {
      record.count += 1;

      if (record.count > maxRequests) {
        return NextResponse.json(
          {
            error: 'Too many requests. Please try again later.',
            retryAfter: Math.ceil((record.resetTime - now) / 1000),
          },
          { 
            status: 429,
            headers: {
              'Retry-After': Math.ceil((record.resetTime - now) / 1000).toString(),
            },
          }
        );
      }
    }

    rateLimitStore.set(key, record);
    return handler(request);
  };
}

/**
 * Combined middleware: Auth + Rate Limit
 */
export function withAuthAndRateLimit(
  handler: (req: AuthRequest) => Promise<NextResponse>
) {
  return withRateLimit(
    (request) => withAuth(request, handler),
    RATE_LIMIT_WINDOW_MS,
    RATE_LIMIT_MAX_REQUESTS
  );
}
