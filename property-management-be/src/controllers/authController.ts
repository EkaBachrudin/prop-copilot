import { Request, Response } from 'express';
import { AppError } from '../utils/AppError';
import { getCurrentUser, login } from '../services/authService';
import { LoginDto } from '../types';

export const loginController = async (req: Request, res: Response): Promise<void> => {
  const dto: LoginDto = req.body;
  const result = await login(dto);

  res.cookie('access_token', result.token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: result.maxAge,
  });

  res.status(200).json({
    success: true,
    message: 'Login successful',
    data: { user: result.user },
  });
};

export const logoutController = async (_req: Request, res: Response): Promise<void> => {
  res.clearCookie('access_token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
  });

  res.status(200).json({ success: true, message: 'Logged out successfully' });
};

export const meController = async (req: Request, res: Response): Promise<void> => {
  if (!req.user) {
    throw new AppError('Authentication required', 401, 'UNAUTHORIZED');
  }
  const user = await getCurrentUser(req.user.sub);
  res.status(200).json({ success: true, data: { user } });
};
