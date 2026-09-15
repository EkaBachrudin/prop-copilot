import { pool } from '../config/database';
import { AppError } from '../utils/AppError';
import { verifyPassword } from '../utils/auth/password';
import { generateToken, getTokenMaxAge } from '../utils/auth/jwt';
import { LoginDto, PublicUser, User } from '../types';

const findUserByEmail = async (email: string): Promise<User | null> => {
  const result = await pool.query(
    `SELECT id, full_name, email, phone, password_hash, is_active, created_at, updated_at
     FROM users
     WHERE email = $1`,
    [email]
  );
  if (result.rows.length === 0) return null;
  return result.rows[0] as User & { password_hash: string };
};

export interface LoginResult {
  user: PublicUser;
  token: string;
  maxAge: number;
}

export const login = async (dto: LoginDto): Promise<LoginResult> => {
  const email = dto.email?.trim().toLowerCase();
  const password = dto.password;

  if (!email || !password) {
    throw new AppError('Email and password are required', 400, 'VALIDATION_ERROR');
  }

  const user = await findUserByEmail(email);
  if (!user) {
    throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
  }

  const passwordHash = (user as User & { password_hash: string }).password_hash || '';
  const isValid = await verifyPassword(password, passwordHash);
  if (!isValid) {
    throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
  }

  if (!user.is_active) {
    throw new AppError(
      'Account is inactive. Please contact administrator.',
      403,
      'ACCOUNT_INACTIVE'
    );
  }

  const token = generateToken({ sub: user.id, email: user.email });

  return {
    user: {
      id: user.id,
      full_name: user.full_name,
      email: user.email,
      phone: user.phone,
    },
    token,
    maxAge: getTokenMaxAge(),
  };
};

export const getCurrentUser = async (userId: string): Promise<PublicUser> => {
  const result = await pool.query(
    `SELECT id, full_name, email, phone
     FROM users
     WHERE id = $1 AND is_active = true`,
    [userId]
  );

  if (result.rows.length === 0) {
    throw new AppError('User not found', 404, 'NOT_FOUND');
  }

  return result.rows[0] as PublicUser;
};
