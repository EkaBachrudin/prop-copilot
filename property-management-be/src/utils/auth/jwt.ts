import jwt from 'jsonwebtoken';
import { JwtPayload } from '../../types';

const JWT_SECRET = process.env.JWT_SECRET || 'change-this-secret-key';
const JWT_TTL_SECONDS = parseInt(process.env.JWT_TTL_SECONDS || '28800', 10); // 8 hours

type TokenClaims = Pick<JwtPayload, 'sub' | 'email'>;

export const generateToken = (payload: TokenClaims): string => {
  return jwt.sign(payload, JWT_SECRET, {
    algorithm: 'HS256',
    expiresIn: JWT_TTL_SECONDS,
  });
};

export const verifyToken = (token: string): JwtPayload | null => {
  try {
    return jwt.verify(token, JWT_SECRET) as JwtPayload;
  } catch {
    return null;
  }
};

/** Cookie max-age in milliseconds. */
export const getTokenMaxAge = (): number => JWT_TTL_SECONDS * 1000;
