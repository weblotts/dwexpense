import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';

const SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret-change-me';

export interface AuthedRequest extends Request {
  userId?: string;
}

export function signToken(userId: string): string {
  return jwt.sign({ uid: userId }, SECRET, { expiresIn: '15m' });
}

export function signRefreshToken(userId: string): string {
  return jwt.sign({ uid: userId }, REFRESH_SECRET, { expiresIn: '30d' });
}

export function verifyRefreshToken(token: string): { uid: string } {
  return jwt.verify(token, REFRESH_SECRET) as { uid: string };
}

/** Express middleware: requires a valid Bearer token, sets req.userId. */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required', status: 401 });
  }
  try {
    const payload = jwt.verify(header.slice(7), SECRET) as { uid: string };
    (req as AuthedRequest).userId = payload.uid;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token', status: 401 });
  }
}
