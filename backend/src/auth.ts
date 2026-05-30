import jwt from 'jsonwebtoken';
import type { JwtPayload } from 'jsonwebtoken';

export type UserToken = {
  sub: number;
  role: string;
  email: string;
};

if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET environment variable is required');
const JWT_SECRET = process.env.JWT_SECRET as string;

export function signUserToken(user: { id: number; email: string; role: string }) {
  return jwt.sign({ sub: user.id, role: user.role, email: user.email }, JWT_SECRET, { expiresIn: '8h' });
}

export function verifyToken(token: string) {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (typeof decoded !== 'object' || decoded === null) return null;

    const payload = decoded as JwtPayload & Partial<UserToken>;
    if (typeof payload.sub !== 'number' || typeof payload.role !== 'string' || typeof payload.email !== 'string') {
      return null;
    }

    return { sub: payload.sub, role: payload.role, email: payload.email };
  } catch {
    return null;
  }
}
