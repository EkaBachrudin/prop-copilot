import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../../utils/auth/jwt';
import { AppError } from '../../utils/AppError';
import { JwtPayload } from '../../types';

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export const authenticate = (req: Request, _res: Response, next: NextFunction): void => {
  const accessToken = req.cookies?.access_token;

  if (!accessToken) {
    next(new AppError('Authentication required. Please login.', 401, 'UNAUTHORIZED'));
    return;
  }

  const payload = verifyToken(accessToken);
  if (!payload) {
    next(new AppError('Invalid or expired token. Please login again.', 401, 'UNAUTHORIZED'));
    return;
  }

  req.user = payload;
  next();
};
