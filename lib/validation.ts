// src/lib/validation.ts
// Input validation schemas
import { z } from 'zod';

/**
 * Input validation schemas
 */

// Auth schemas
export const registerSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(8).max(128),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// Credential schemas
export const issuanceClaimsSchema = z.record(z.string(), z.any());

export const issueCredentialSchema = z.object({
  title: z.string().min(1).max(200),
  claims: issuanceClaimsSchema,
  issuerName: z.string().min(1).max(200),
  expiresInDays: z.number().int().min(1).max(3650).optional(),
});

export const shareCredentialSchema = z.object({
  credentialId: z.string().min(1),
  selectedFields: z.array(z.string()).min(1),
  expiresInMinutes: z.number().int().min(1).max(10080).optional(), // Max 7 days
});

export const verifyPresentationSchema = z.object({
  presentationToken: z.string().min(1),
  presentation: z.any(), // Verified in handler
});

/**
 * Infer types from schemas
 */
export type RegisterData = z.infer<typeof registerSchema>;
export type LoginData = z.infer<typeof loginSchema>;
export type IssueCredentialData = z.infer<typeof issueCredentialSchema>;
export type ShareCredentialData = z.infer<typeof shareCredentialSchema>;

/**
 * Validation helper with error handling
 */
export function validate<T>(schema: z.ZodType<T>, data: unknown): { success: true; data: T } | { success: false; errors: Record<string, string> } {
  const result = schema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data as T };
  }

  const errors: Record<string, string> = {};
  result.error.issues.forEach((err: z.ZodIssue) => {
    const key = err.path.join('.');
    errors[key] = err.message;
  });

  return { success: false, errors };
}

/**
 * Sanitize user input to prevent injection attacks
 */
export function sanitizeString(input: string, maxLength: number = 1000): string {
  return input
    .slice(0, maxLength)
    .trim()
    .replace(/[<>]/g, ''); // Remove angle brackets
}

export function sanitizeObject<T extends Record<string, any>>(obj: T): T {
  const sanitized = {} as T;
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      sanitized[key as keyof T] = sanitizeString(value) as any;
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      sanitized[key as keyof T] = sanitizeObject(value) as any;
    } else if (Array.isArray(value)) {
      sanitized[key as keyof T] = value.map(v => 
        typeof v === 'string' ? sanitizeString(v) : v
      ) as any;
    } else {
      sanitized[key as keyof T] = value;
    }
  }
  return sanitized;
}
