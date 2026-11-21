import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import type { Request, Response, NextFunction } from 'express';
import { db } from './db.ts';
import type { UserProfile, UserRole } from '../types.ts';

const JWT_SECRET = process.env.JWT_SECRET || 'vows_venues_luxury_dev_secret_key_2026';
export const AUTH_COOKIE_NAME = 'vv_session';

export interface AuthPayload {
  sub: string;
  role: UserRole;
  email: string;
}

export interface AuthedRequest extends Request {
  authUser?: UserProfile;
}

export function signAuthToken(payload: AuthPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyAuthToken(token: string): AuthPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as AuthPayload;
  } catch {
    return null;
  }
}

export function hashPassword(password: string): string {
  return bcrypt.hashSync(password, 10);
}

export function verifyPassword(password: string, hash: string): boolean {
  return bcrypt.compareSync(password, hash);
}

export function extractToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7).trim();
  }
  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) return null;
  for (const part of cookieHeader.split(';')) {
    const [k, ...rest] = part.trim().split('=');
    if (k === AUTH_COOKIE_NAME) {
      return decodeURIComponent(rest.join('='));
    }
  }
  return null;
}

export function attachOptionalUser(req: AuthedRequest, _res: Response, next: NextFunction) {
  const token = extractToken(req);
  if (token) {
    const decoded = verifyAuthToken(token);
    if (decoded) {
      const user = db
        .prepare(
          `SELECT id, name, email, phone, role, status, email_verified, avatar_url, created_at
           FROM users WHERE id = ?`
        )
        .get(decoded.sub) as any;
      if (user && user.status === 'ACTIVE') {
        req.authUser = {
          ...user,
          email_verified: Boolean(user.email_verified),
        };
      }
    }
  }
  next();
}

export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const token = extractToken(req);
  if (!token) {
    return res.status(401).json({ error: 'Authentication required. Please sign in.' });
  }
  const decoded = verifyAuthToken(token);
  if (!decoded) {
    return res.status(401).json({ error: 'Invalid or expired session. Please sign in again.' });
  }
  const user = db
    .prepare(
      `SELECT id, name, email, phone, role, status, email_verified, avatar_url, created_at
       FROM users WHERE id = ?`
    )
    .get(decoded.sub) as any;

  if (!user) {
    return res.status(401).json({ error: 'Account not found.' });
  }
  if (user.status === 'SUSPENDED') {
    return res.status(403).json({ error: 'Your account has been suspended. Please contact support.' });
  }

  req.authUser = {
    ...user,
    email_verified: Boolean(user.email_verified),
  };
  next();
}

export function requireAdmin(req: AuthedRequest, res: Response, next: NextFunction) {
  requireAuth(req, res, () => {
    if (!req.authUser || req.authUser.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Administrator privileges required.' });
    }
    next();
  });
}

export function getRazorpaySecret(): string {
  return process.env.RAZORPAY_KEY_SECRET || 'rzp_test_vows_venues_secret_2026';
}

export function computeHmacSignature(orderId: string, paymentId: string, secret = getRazorpaySecret()): string {
  return crypto
    .createHmac('sha256', secret)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');
}

export function verifyWebhookSignature(rawBody: string, signature: string, secret: string): boolean {
  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
}
