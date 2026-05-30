import jwt from 'jsonwebtoken';
import type { JwtPayload } from 'jsonwebtoken';

export type UserType = 'operational' | 'platform';

export type AuthTokenClaims = {
  sub: number;
  email: string;
  role: string;
  userType: UserType;
  companyId?: number | null;
  membershipId?: number | null;
};

if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET environment variable is required');
const JWT_SECRET = process.env.JWT_SECRET as string;
const JWT_EXPIRES_IN = '8h';

type SignClaimsInput = {
  id: number;
  email: string;
  role: string;
  userType?: UserType;
  companyId?: number | null;
  membershipId?: number | null;
};

function normalizeNullableNumber(value: unknown): number | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== 'number' || !Number.isFinite(value)) return undefined;
  return value;
}

export function createAuthTokenClaims(input: SignClaimsInput): AuthTokenClaims {
  return {
    sub: input.id,
    email: input.email,
    role: input.role,
    userType: input.userType ?? 'operational',
    companyId: normalizeNullableNumber(input.companyId),
    membershipId: normalizeNullableNumber(input.membershipId),
  };
}

export function signAuthToken(input: SignClaimsInput): string {
  return jwt.sign(createAuthTokenClaims(input), JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export function verifyAuthToken(token: string): AuthTokenClaims | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (typeof decoded !== 'object' || decoded === null) return null;

    const payload = decoded as JwtPayload & Partial<AuthTokenClaims>;
    if (typeof payload.sub !== 'number') return null;
    if (typeof payload.email !== 'string') return null;
    if (typeof payload.role !== 'string') return null;
    if (payload.userType !== 'operational' && payload.userType !== 'platform') return null;

    return {
      sub: payload.sub,
      email: payload.email,
      role: payload.role,
      userType: payload.userType,
      companyId: normalizeNullableNumber(payload.companyId),
      membershipId: normalizeNullableNumber(payload.membershipId),
    };
  } catch {
    return null;
  }
}
