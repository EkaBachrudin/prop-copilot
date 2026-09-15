# 03 — Backend

Express 5 + TypeScript + `pg`. This document contains the complete source for every
backend file, followed by the API reference and error codes.

> Migrations (`src/migrations/*.sql`) and the utilities `src/utils/migrate.ts` and
> `src/utils/seed.ts` are reproduced in [`02-DATABASE.md`](./02-DATABASE.md).

---

## 1. Package manifest

### 1.1 `property-management-be/package.json`

```json
{
  "name": "property-management-be",
  "version": "1.0.0",
  "description": "Property Management Backend API",
  "main": "dist/index.js",
  "scripts": {
    "build": "tsc",
    "start": "node dist/index.js",
    "dev": "nodemon --exec ts-node src/index.ts",
    "start:dev": "nodemon --exec ts-node src/index.ts",
    "lint": "eslint . --ext .ts",
    "lint:fix": "eslint . --ext .ts --fix",
    "format": "prettier --write \"src/**/*.ts\"",
    "format:check": "prettier --check \"src/**/*.ts\"",
    "type-check": "tsc --noEmit",
    "db:migrate": "ts-node src/utils/migrate.ts run",
    "db:migrate:status": "ts-node src/utils/migrate.ts status",
    "db:migrate:rollback": "ts-node src/utils/migrate.ts rollback",
    "db:migrate:prod": "node dist/utils/migrate.js run",
    "db:migrate:status:prod": "node dist/utils/migrate.js status",
    "db:seed": "ts-node src/utils/seed.ts"
  },
  "license": "ISC",
  "dependencies": {
    "bcryptjs": "^3.0.3",
    "compression": "^1.8.1",
    "cookie-parser": "^1.4.7",
    "cors": "^2.8.5",
    "dotenv": "^17.2.3",
    "express": "^5.2.1",
    "express-rate-limit": "^8.2.1",
    "helmet": "^8.1.0",
    "jsonwebtoken": "^9.0.3",
    "morgan": "^1.10.1",
    "pg": "^8.16.3"
  },
  "devDependencies": {
    "@types/bcryptjs": "^2.4.6",
    "@types/compression": "^1.8.1",
    "@types/cookie-parser": "^1.4.10",
    "@types/cors": "^2.8.19",
    "@types/express": "^5.0.6",
    "@types/express-rate-limit": "^5.1.3",
    "@types/jsonwebtoken": "^9.0.10",
    "@types/morgan": "^1.9.10",
    "@types/node": "^25.0.8",
    "@types/pg": "^8.16.0",
    "@typescript-eslint/eslint-plugin": "^8.53.0",
    "@typescript-eslint/parser": "^8.53.0",
    "eslint": "^9.39.2",
    "eslint-config-prettier": "^10.1.8",
    "eslint-plugin-prettier": "^5.5.4",
    "nodemon": "^3.1.11",
    "prettier": "^3.7.4",
    "ts-node": "^10.9.2",
    "typescript": "^5.9.3"
  }
}
```

### 1.2 `tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "node16",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "moduleResolution": "node16",
    "allowSyntheticDefaultImports": true,
    "declaration": true,
    "sourceMap": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "types": ["node"]
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

### 1.3 `nodemon.json`

```json
{
  "watch": ["src"],
  "ext": "ts,json,sql",
  "ignore": ["src/**/*.spec.ts"],
  "exec": "ts-node src/index.ts"
}
```

### 1.4 `.eslintrc.json`

```json
{
  "parser": "@typescript-eslint/parser",
  "parserOptions": { "ecmaVersion": 2022, "sourceType": "module" },
  "plugins": ["@typescript-eslint", "prettier"],
  "extends": ["eslint:recommended", "plugin:@typescript-eslint/recommended", "prettier"],
  "rules": {
    "@typescript-eslint/no-explicit-any": "warn",
    "@typescript-eslint/explicit-function-return-type": "off",
    "prettier/prettier": "error"
  },
  "env": { "node": true, "es2022": true }
}
```

### 1.5 `.prettierrc.json`

```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 100,
  "tabWidth": 2
}
```

### 1.6 `.env.example`

```bash
# --------------------------------------------
# General
# --------------------------------------------
NODE_ENV=development

# --------------------------------------------
# API
# --------------------------------------------
APP_PORT=4000
CORS_ORIGIN=http://localhost:3000

# --------------------------------------------
# Auth
# --------------------------------------------
JWT_SECRET=change-this-to-a-random-secret-key-at-least-32-chars-long
JWT_TTL_SECONDS=28800

# --------------------------------------------
# Database
# --------------------------------------------
DB_HOST=localhost
DB_PORT=5432
DB_NAME=property_management
DB_USER=postgres
DB_PASSWORD=postgres
```

---

## 2. Application bootstrap

### 2.1 `src/config/database.ts`

```ts
import { Pool, PoolConfig } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const poolConfig: PoolConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME || 'property_management',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
};

export const pool = new Pool(poolConfig);

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

export const testConnection = async (): Promise<boolean> => {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW()');
    client.release();
    console.log('Database connected successfully at:', result.rows[0].now);
    return true;
  } catch (error) {
    console.error('Database connection failed:', error);
    return false;
  }
};

export const closePool = async (): Promise<void> => {
  await pool.end();
  console.log('Database pool closed');
};
```

### 2.2 `src/index.ts`

```ts
import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import { errorHandler } from './middleware/errorHandler';
import { requestLogger } from './middleware/requestLogger';
import { generalLimiter } from './middleware/rateLimiter';
import { AppError } from './utils/AppError';
import { testConnection, closePool } from './config/database';
import authRoutes from './routes/authRoutes';
import propertiesRoutes from './routes/propertiesRoutes';
import blocksRoutes from './routes/blocksRoutes';
import unitsRoutes from './routes/unitsRoutes';

dotenv.config();

const app: Application = express();
const PORT = process.env.APP_PORT || 4000;
const API_VERSION = '/api/v1';

app.set('trust proxy', 1);

const getAllowedOrigins = (): string | string[] => {
  const corsOrigin = process.env.CORS_ORIGIN;
  if (!corsOrigin) {
    return process.env.NODE_ENV === 'production' ? [] : 'http://localhost:3000';
  }
  return corsOrigin.split(',').map((origin) => origin.trim());
};

app.use(
  cors({
    origin: getAllowedOrigins(),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(cookieParser());
app.use(compression());

if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('combined'));
}
app.use(requestLogger);

app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
  });
});

app.get('/', (_req: Request, res: Response) => {
  res.status(200).json({
    message: 'Property Management API',
    version: '1.0.0',
  });
});

app.use(`${API_VERSION}`, generalLimiter);
app.use(`${API_VERSION}/auth`, authRoutes);
app.use(`${API_VERSION}/properties`, propertiesRoutes);
app.use(`${API_VERSION}`, blocksRoutes);
app.use(`${API_VERSION}`, unitsRoutes);

app.use((_req: Request, _res: Response, next) => {
  next(new AppError('Route not found', 404, 'NOT_FOUND'));
});

app.use(errorHandler);

const startServer = async () => {
  const dbConnected = await testConnection();
  if (!dbConnected) {
    console.error('Failed to connect to database. Server will not start.');
    process.exit(1);
  }

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
  });
};

startServer();

process.on('SIGINT', async () => {
  console.log('\nShutting down gracefully...');
  await closePool();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\nShutting down gracefully...');
  await closePool();
  process.exit(0);
});

export default app;
```

---

## 3. Shared types

### 3.1 `src/types/index.ts`

```ts
// ---------------------------------------------------------------------------
// API envelopes
// ---------------------------------------------------------------------------
export interface ApiSuccess<T> {
  success: true;
  message?: string;
  data: T;
}

export interface ApiErrorBody {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, string[]>;
  };
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------
export interface JwtPayload {
  sub: string;
  email: string;
  iat: number;
  exp: number;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface User {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface PublicUser {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
}

// ---------------------------------------------------------------------------
// Domain
// ---------------------------------------------------------------------------
export type UnitStatus = 'available' | 'reserved' | 'booked' | 'sold';

export const UNIT_STATUSES: UnitStatus[] = ['available', 'reserved', 'booked', 'sold'];

export interface PaginationMeta {
  page: number;
  limit: number;
  total_items: number;
  total_pages: number;
}

export interface Property {
  id: string;
  name: string;
  city: string;
  land_area: number | null;
  address: string | null;
  description: string | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface PropertyListItem extends Property {
  total_blocks: number;
  total_units: number;
}

export interface Block {
  id: string;
  property_id: string;
  name: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface BlockListItem {
  id: string;
  name: string;
  is_active: boolean;
  total_units: number;
  created_at: Date;
  updated_at: Date;
}

export interface Unit {
  id: string;
  block_id: string;
  name: string;
  land_area: number | null;
  status: UnitStatus;
  created_at: Date;
  updated_at: Date;
}

export interface UnitListItem {
  id: string;
  name: string;
  land_area: number | null;
  status: UnitStatus;
  created_at: Date;
  updated_at: Date;
}

export interface PropertyDetail {
  property: Property;
  blocks: BlockListItem[];
}

export interface BlockInfo {
  id: string;
  name: string;
  property_id: string;
  property_name: string;
}

export interface PaginatedUnitsResponse {
  block: BlockInfo;
  units: UnitListItem[];
  pagination: PaginationMeta;
}

// ---------------------------------------------------------------------------
// Query / DTOs
// ---------------------------------------------------------------------------
export interface GetPropertiesQuery {
  page?: number;
  limit?: number;
  search?: string;
  city?: string;
}

export interface GetUnitsQuery {
  page?: number;
  limit?: number;
  status?: UnitStatus;
  search?: string;
}

export interface CreatePropertyDto {
  name?: string;
  city?: string;
  land_area?: number;
  address?: string;
  description?: string;
}

export interface UpdatePropertyDto {
  name?: string;
  city?: string;
  land_area?: number;
  address?: string;
  description?: string;
}

export interface CreateBlockDto {
  name?: string;
}

export interface UpdateBlockDto {
  name?: string;
}

export interface CreateUnitDto {
  name?: string;
  land_area?: number;
  status?: UnitStatus;
}

export interface UpdateUnitDto {
  name?: string;
  land_area?: number;
  status?: UnitStatus;
}
```

---

## 4. Utilities

### 4.1 `src/utils/AppError.ts`

```ts
export type ErrorDetails = Record<string, string[]>;

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: ErrorDetails;

  constructor(
    message: string,
    statusCode = 500,
    code = 'INTERNAL_ERROR',
    details?: ErrorDetails
  ) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}
```

### 4.2 `src/utils/naturalSort.ts`

```ts
const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });

export const naturalCompare = (a: string, b: string): number => collator.compare(a, b);
```

### 4.3 `src/utils/auth/jwt.ts`

```ts
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
```

### 4.4 `src/utils/auth/password.ts`

```ts
import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 12;

export const hashPassword = async (password: string): Promise<string> => {
  return bcrypt.hash(password, SALT_ROUNDS);
};

export const verifyPassword = async (password: string, hash: string): Promise<boolean> => {
  return bcrypt.compare(password, hash);
};
```

---

## 5. Middleware

### 5.1 `src/middleware/auth/authenticate.ts`

```ts
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
```

### 5.2 `src/middleware/errorHandler.ts`

```ts
import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/AppError';

export const errorHandler = (
  err: Error | AppError,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        ...(err.details ? { details: err.details } : {}),
      },
    });
    return;
  }

  console.error('Unexpected error:', err);
  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'Internal server error',
      ...(process.env.NODE_ENV === 'development' && err.stack ? { details: { stack: [err.stack] } } : {}),
    },
  });
};
```

### 5.3 `src/middleware/rateLimiter.ts`

```ts
import rateLimit from 'express-rate-limit';

/** Applies to POST /auth/login. */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: {
    success: false,
    error: { code: 'RATE_LIMITED', message: 'Too many authentication attempts, please try again later.' },
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/** Applies to all /api/v1 routes. */
export const generalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 200,
  message: {
    success: false,
    error: { code: 'RATE_LIMITED', message: 'Too many requests, please slow down.' },
  },
  standardHeaders: true,
  legacyHeaders: false,
});
```

### 5.4 `src/middleware/requestLogger.ts`

```ts
import { Request, Response, NextFunction } from 'express';

export const requestLogger = (req: Request, res: Response, next: NextFunction): void => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    const message = `${req.method} ${req.originalUrl} ${res.statusCode} - ${duration}ms`;
    if (res.statusCode >= 400) console.error(message);
    else console.log(message);
  });

  next();
};
```

### 5.5 `src/middleware/index.ts`

```ts
export * from './auth/authenticate';
export * from './errorHandler';
export * from './rateLimiter';
export * from './requestLogger';
```

---

## 6. Services

### 6.1 `src/services/authService.ts`

```ts
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
    throw new AppError('Account is inactive. Please contact administrator.', 403, 'ACCOUNT_INACTIVE');
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
```

### 6.2 `src/services/propertiesService.ts`

```ts
import { pool } from '../config/database';
import { AppError } from '../utils/AppError';
import {
  CreatePropertyDto,
  GetPropertiesQuery,
  Property,
  PropertyDetail,
  PropertyListItem,
  UpdatePropertyDto,
} from '../types';

export const getProperties = async (
  query: GetPropertiesQuery
): Promise<{ properties: PropertyListItem[]; pagination: { page: number; limit: number; total_items: number; total_pages: number } }> => {
  const page = Math.max(1, query.page || 1);
  const limit = Math.min(50, query.limit || 10);
  const offset = (page - 1) * limit;
  const search = query.search?.trim();
  const city = query.city?.trim();

  const conditions: string[] = [];
  const params: unknown[] = [];
  let i = 1;

  if (search) {
    conditions.push(`p.name ILIKE $${i++}`);
    params.push(`%${search}%`);
  }
  if (city) {
    conditions.push(`p.city ILIKE $${i++}`);
    params.push(`%${city}%`);
  }
  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const countResult = await pool.query(
    `SELECT COUNT(*) AS total FROM properties p ${whereClause}`,
    params
  );
  const totalItems = parseInt(countResult.rows[0].total, 10);
  const totalPages = Math.ceil(totalItems / limit);

  const dataQuery = `
    SELECT
      p.id, p.name, p.city, p.land_area, p.address, p.description,
      p.is_active, p.created_at, p.updated_at,
      COALESCE(bc.block_count, 0) AS total_blocks,
      COALESCE(uc.unit_count, 0)  AS total_units
    FROM properties p
    LEFT JOIN (
      SELECT property_id, COUNT(id) AS block_count
      FROM blocks
      WHERE is_active = true
      GROUP BY property_id
    ) bc ON bc.property_id = p.id
    LEFT JOIN (
      SELECT b.property_id, COUNT(u.id) AS unit_count
      FROM blocks b
      JOIN units u ON u.block_id = b.id
      GROUP BY b.property_id
    ) uc ON uc.property_id = p.id
    ${whereClause}
    ORDER BY p.name ASC
    LIMIT $${i++} OFFSET $${i++}
  `;
  params.push(limit, offset);

  const result = await pool.query(dataQuery, params);

  return {
    properties: result.rows as PropertyListItem[],
    pagination: { page, limit, total_items: totalItems, total_pages: totalPages },
  };
};

export const getPropertyDetail = async (propertyId: string): Promise<PropertyDetail> => {
  const propertyResult = await pool.query('SELECT * FROM properties WHERE id = $1', [propertyId]);
  if (propertyResult.rows.length === 0) {
    throw new AppError('Property not found', 404, 'NOT_FOUND');
  }

  const blocksResult = await pool.query(
    `SELECT
       b.id, b.name, b.is_active, b.created_at, b.updated_at,
       COALESCE(uc.unit_count, 0) AS total_units
     FROM blocks b
     LEFT JOIN (
       SELECT block_id, COUNT(id) AS unit_count
       FROM units
       GROUP BY block_id
     ) uc ON uc.block_id = b.id
     WHERE b.property_id = $1
     ORDER BY b.name ASC`,
    [propertyId]
  );

  return {
    property: propertyResult.rows[0] as Property,
    blocks: blocksResult.rows,
  };
};

const validatePropertyFields = (dto: CreatePropertyDto | UpdatePropertyDto, isCreate: boolean) => {
  if (isCreate || dto.name !== undefined) {
    if (!dto.name || dto.name.trim().length === 0) {
      throw new AppError('Property name is required', 400, 'VALIDATION_ERROR', {
        name: ['Property name is required'],
      });
    }
    if (dto.name.length > 255) {
      throw new AppError('Property name must be maximum 255 characters', 400, 'VALIDATION_ERROR', {
        name: ['Maximum 255 characters'],
      });
    }
  }

  if (isCreate || dto.city !== undefined) {
    if (!dto.city || dto.city.trim().length === 0) {
      throw new AppError('City is required', 400, 'VALIDATION_ERROR', {
        city: ['City is required'],
      });
    }
    if (dto.city.length > 100) {
      throw new AppError('City must be maximum 100 characters', 400, 'VALIDATION_ERROR', {
        city: ['Maximum 100 characters'],
      });
    }
  }

  if (dto.land_area !== undefined) {
    if (typeof dto.land_area !== 'number' || Number.isNaN(dto.land_area) || dto.land_area < 0) {
      throw new AppError('Land area must be a non-negative number', 400, 'VALIDATION_ERROR', {
        land_area: ['Must be a non-negative number'],
      });
    }
  }
};

export const createProperty = async (dto: CreatePropertyDto): Promise<Property> => {
  validatePropertyFields(dto, true);

  const result = await pool.query(
    `INSERT INTO properties (name, city, land_area, address, description, is_active, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, true, NOW(), NOW())
     RETURNING *`,
    [
      dto.name!.trim(),
      dto.city!.trim(),
      dto.land_area ?? null,
      dto.address?.trim() || null,
      dto.description?.trim() || null,
    ]
  );

  return result.rows[0] as Property;
};

export const updateProperty = async (propertyId: string, dto: UpdatePropertyDto): Promise<Property> => {
  const existing = await pool.query('SELECT id FROM properties WHERE id = $1', [propertyId]);
  if (existing.rows.length === 0) {
    throw new AppError('Property not found', 404, 'NOT_FOUND');
  }

  validatePropertyFields(dto, false);

  const hasField =
    dto.name !== undefined ||
    dto.city !== undefined ||
    dto.land_area !== undefined ||
    dto.address !== undefined ||
    dto.description !== undefined;

  if (!hasField) {
    throw new AppError('At least one field must be provided', 400, 'VALIDATION_ERROR');
  }

  const result = await pool.query(
    `UPDATE properties
     SET name = COALESCE($2, name),
         city = COALESCE($3, city),
         land_area = COALESCE($4, land_area),
         address = COALESCE($5, address),
         description = COALESCE($6, description),
         updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [
      propertyId,
      dto.name?.trim(),
      dto.city?.trim(),
      dto.land_area ?? null,
      dto.address?.trim() ?? null,
      dto.description?.trim() ?? null,
    ]
  );

  return result.rows[0] as Property;
};

export const deleteProperty = async (propertyId: string): Promise<void> => {
  const existing = await pool.query('SELECT id FROM properties WHERE id = $1', [propertyId]);
  if (existing.rows.length === 0) {
    throw new AppError('Property not found', 404, 'NOT_FOUND');
  }
  await pool.query('DELETE FROM properties WHERE id = $1', [propertyId]);
};
```

> **Note on partial updates:** `COALESCE($n, column)` keeps the old value when the DTO
> field is `null`/`undefined`. To clear a nullable text field to `NULL`, send an empty
> string (which is trimmed to `''`); the clone treats empty strings as values, not as
> "no change". Adjust to a sentinel if you need explicit nulling.

### 6.3 `src/services/blocksService.ts`

```ts
import { pool } from '../config/database';
import { AppError } from '../utils/AppError';
import { Block, CreateBlockDto, UpdateBlockDto } from '../types';

const validateBlockName = (dto: CreateBlockDto | UpdateBlockDto) => {
  if (!dto.name || dto.name.trim().length === 0) {
    throw new AppError('Block name is required', 400, 'VALIDATION_ERROR', {
      name: ['Block name is required'],
    });
  }
  if (dto.name.length > 100) {
    throw new AppError('Block name must be maximum 100 characters', 400, 'VALIDATION_ERROR', {
      name: ['Maximum 100 characters'],
    });
  }
};

export const createBlock = async (propertyId: string, dto: CreateBlockDto): Promise<Block> => {
  validateBlockName(dto);

  const property = await pool.query('SELECT id FROM properties WHERE id = $1', [propertyId]);
  if (property.rows.length === 0) {
    throw new AppError('Property not found', 404, 'NOT_FOUND');
  }

  const duplicate = await pool.query(
    'SELECT id FROM blocks WHERE property_id = $1 AND name = $2',
    [propertyId, dto.name!.trim()]
  );
  if (duplicate.rows.length > 0) {
    throw new AppError('Block name already exists in this property', 409, 'CONFLICT', {
      name: ['Block name already exists in this property'],
    });
  }

  const result = await pool.query(
    `INSERT INTO blocks (property_id, name, is_active, created_at, updated_at)
     VALUES ($1, $2, true, NOW(), NOW())
     RETURNING *`,
    [propertyId, dto.name!.trim()]
  );

  return result.rows[0] as Block;
};

export const updateBlock = async (blockId: string, dto: UpdateBlockDto): Promise<Block> => {
  validateBlockName(dto);

  const existing = await pool.query(
    'SELECT id, property_id FROM blocks WHERE id = $1',
    [blockId]
  );
  if (existing.rows.length === 0) {
    throw new AppError('Block not found', 404, 'NOT_FOUND');
  }

  const propertyId = existing.rows[0].property_id as string;

  const duplicate = await pool.query(
    'SELECT id FROM blocks WHERE property_id = $1 AND name = $2 AND id != $3',
    [propertyId, dto.name!.trim(), blockId]
  );
  if (duplicate.rows.length > 0) {
    throw new AppError('Block name already exists in this property', 409, 'CONFLICT', {
      name: ['Block name already exists in this property'],
    });
  }

  const result = await pool.query(
    `UPDATE blocks SET name = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
    [dto.name!.trim(), blockId]
  );

  return result.rows[0] as Block;
};

export const deleteBlock = async (blockId: string): Promise<void> => {
  const existing = await pool.query('SELECT id FROM blocks WHERE id = $1', [blockId]);
  if (existing.rows.length === 0) {
    throw new AppError('Block not found', 404, 'NOT_FOUND');
  }
  await pool.query('DELETE FROM blocks WHERE id = $1', [blockId]);
};
```

### 6.4 `src/services/unitsService.ts`

```ts
import { pool } from '../config/database';
import { AppError } from '../utils/AppError';
import { naturalCompare } from '../utils/naturalSort';
import {
  CreateUnitDto,
  GetUnitsQuery,
  PaginatedUnitsResponse,
  UNIT_STATUSES,
  Unit,
  UnitListItem,
  UnitStatus,
  UpdateUnitDto,
} from '../types';

const isValidStatus = (value: unknown): value is UnitStatus =>
  typeof value === 'string' && UNIT_STATUSES.includes(value as UnitStatus);

export const getUnits = async (blockId: string, query: GetUnitsQuery): Promise<PaginatedUnitsResponse> => {
  const page = Math.max(1, query.page || 1);
  const limit = Math.min(100, query.limit || 20);
  const offset = (page - 1) * limit;
  const status = query.status;
  const search = query.search?.trim();

  const blockResult = await pool.query(
    `SELECT b.id, b.name, b.property_id, p.name AS property_name
     FROM blocks b
     JOIN properties p ON p.id = b.property_id
     WHERE b.id = $1`,
    [blockId]
  );
  if (blockResult.rows.length === 0) {
    throw new AppError('Block not found', 404, 'NOT_FOUND');
  }

  const conditions: string[] = ['u.block_id = $1'];
  const params: unknown[] = [blockId];
  let i = 2;

  if (status) {
    if (!isValidStatus(status)) {
      throw new AppError('Invalid status filter', 400, 'VALIDATION_ERROR', {
        status: [`Must be one of: ${UNIT_STATUSES.join(', ')}`],
      });
    }
    conditions.push(`u.status = $${i++}`);
    params.push(status);
  }
  if (search) {
    conditions.push(`u.name ILIKE $${i++}`);
    params.push(`%${search}%`);
  }
  const whereClause = `WHERE ${conditions.join(' AND ')}`;

  const countResult = await pool.query(
    `SELECT COUNT(*) AS total
     FROM units u
     JOIN blocks b ON b.id = u.block_id
     ${whereClause}`,
    params
  );
  const totalItems = parseInt(countResult.rows[0].total, 10);
  const totalPages = Math.ceil(totalItems / limit);

  const rowsResult = await pool.query(
    `SELECT u.id, u.name, u.land_area, u.status, u.created_at, u.updated_at
     FROM units u
     JOIN blocks b ON b.id = u.block_id
     ${whereClause}`,
    params
  );

  const units = (rowsResult.rows as UnitListItem[])
    .sort((a, b) => naturalCompare(a.name, b.name))
    .slice(offset, offset + limit);

  return {
    block: blockResult.rows[0],
    units,
    pagination: { page, limit, total_items: totalItems, total_pages: totalPages },
  };
};

export const getUnitDetail = async (unitId: string): Promise<Unit & { block_name: string; property_id: string; property_name: string }> => {
  const result = await pool.query(
    `SELECT u.*, b.name AS block_name, p.id AS property_id, p.name AS property_name
     FROM units u
     JOIN blocks b ON b.id = u.block_id
     JOIN properties p ON p.id = b.property_id
     WHERE u.id = $1`,
    [unitId]
  );
  if (result.rows.length === 0) {
    throw new AppError('Unit not found', 404, 'NOT_FOUND');
  }
  return result.rows[0];
};

const validateUnitFields = (dto: CreateUnitDto | UpdateUnitDto, isCreate: boolean) => {
  if (isCreate || dto.name !== undefined) {
    if (!dto.name || dto.name.trim().length === 0) {
      throw new AppError('Unit name is required', 400, 'VALIDATION_ERROR', {
        name: ['Unit name is required'],
      });
    }
    if (dto.name.length > 100) {
      throw new AppError('Unit name must be maximum 100 characters', 400, 'VALIDATION_ERROR', {
        name: ['Maximum 100 characters'],
      });
    }
  }

  if (dto.land_area !== undefined) {
    if (typeof dto.land_area !== 'number' || Number.isNaN(dto.land_area) || dto.land_area < 0) {
      throw new AppError('Land area must be a non-negative number', 400, 'VALIDATION_ERROR', {
        land_area: ['Must be a non-negative number'],
      });
    }
  }

  if (dto.status !== undefined && !isValidStatus(dto.status)) {
    throw new AppError('Invalid unit status', 400, 'VALIDATION_ERROR', {
      status: [`Must be one of: ${UNIT_STATUSES.join(', ')}`],
    });
  }
};

export const createUnit = async (blockId: string, dto: CreateUnitDto): Promise<Unit> => {
  validateUnitFields(dto, true);

  const block = await pool.query('SELECT id FROM blocks WHERE id = $1', [blockId]);
  if (block.rows.length === 0) {
    throw new AppError('Block not found', 404, 'NOT_FOUND');
  }

  const duplicate = await pool.query(
    'SELECT id FROM units WHERE block_id = $1 AND name = $2',
    [blockId, dto.name!.trim()]
  );
  if (duplicate.rows.length > 0) {
    throw new AppError('Unit name already exists in this block', 409, 'CONFLICT', {
      name: ['Unit name already exists in this block'],
    });
  }

  const result = await pool.query(
    `INSERT INTO units (block_id, name, land_area, status, created_at, updated_at)
     VALUES ($1, $2, $3, $4, NOW(), NOW())
     RETURNING *`,
    [blockId, dto.name!.trim(), dto.land_area ?? null, dto.status ?? 'available']
  );

  return result.rows[0] as Unit;
};

export const updateUnit = async (unitId: string, dto: UpdateUnitDto): Promise<Unit> => {
  const existing = await pool.query('SELECT id, block_id FROM units WHERE id = $1', [unitId]);
  if (existing.rows.length === 0) {
    throw new AppError('Unit not found', 404, 'NOT_FOUND');
  }
  const blockId = existing.rows[0].block_id as string;

  validateUnitFields(dto, false);

  const hasField =
    dto.name !== undefined || dto.land_area !== undefined || dto.status !== undefined;
  if (!hasField) {
    throw new AppError('At least one field must be provided', 400, 'VALIDATION_ERROR');
  }

  if (dto.name !== undefined) {
    const duplicate = await pool.query(
      'SELECT id FROM units WHERE block_id = $1 AND name = $2 AND id != $3',
      [blockId, dto.name.trim(), unitId]
    );
    if (duplicate.rows.length > 0) {
      throw new AppError('Unit name already exists in this block', 409, 'CONFLICT', {
        name: ['Unit name already exists in this block'],
      });
    }
  }

  const result = await pool.query(
    `UPDATE units
     SET name = COALESCE($2, name),
         land_area = COALESCE($3, land_area),
         status = COALESCE($4, status),
         updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [unitId, dto.name?.trim(), dto.land_area ?? null, dto.status ?? null]
  );

  return result.rows[0] as Unit;
};

export const deleteUnit = async (unitId: string): Promise<void> => {
  const existing = await pool.query('SELECT id FROM units WHERE id = $1', [unitId]);
  if (existing.rows.length === 0) {
    throw new AppError('Unit not found', 404, 'NOT_FOUND');
  }
  await pool.query('DELETE FROM units WHERE id = $1', [unitId]);
};
```

---

## 7. Controllers

### 7.1 `src/controllers/authController.ts`

```ts
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
```

### 7.2 `src/controllers/propertiesController.ts`

```ts
import { Request, Response } from 'express';
import {
  createProperty,
  deleteProperty,
  getProperties,
  getPropertyDetail,
  updateProperty,
} from '../services/propertiesService';
import { CreatePropertyDto, GetPropertiesQuery, UpdatePropertyDto } from '../types';

const parseLandArea = (value: unknown): number | undefined => {
  if (value === undefined || value === null || value === '') return undefined;
  const parsed = typeof value === 'number' ? value : parseFloat(String(value));
  return Number.isNaN(parsed) ? undefined : parsed;
};

export const getPropertiesController = async (req: Request, res: Response): Promise<void> => {
  const query: GetPropertiesQuery = {
    page: req.query.page ? parseInt(req.query.page as string, 10) : undefined,
    limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
    search: req.query.search as string | undefined,
    city: req.query.city as string | undefined,
  };

  const result = await getProperties(query);
  res.status(200).json({ success: true, data: result });
};

export const getPropertyDetailController = async (req: Request, res: Response): Promise<void> => {
  const result = await getPropertyDetail(req.params.id as string);
  res.status(200).json({ success: true, data: result });
};

export const createPropertyController = async (req: Request, res: Response): Promise<void> => {
  const dto: CreatePropertyDto = {
    name: req.body.name,
    city: req.body.city,
    land_area: parseLandArea(req.body.land_area),
    address: req.body.address,
    description: req.body.description,
  };

  const property = await createProperty(dto);
  res.status(201).json({
    success: true,
    message: 'Property created successfully',
    data: { property },
  });
};

export const updatePropertyController = async (req: Request, res: Response): Promise<void> => {
  const dto: UpdatePropertyDto = {
    name: req.body.name,
    city: req.body.city,
    land_area: parseLandArea(req.body.land_area),
    address: req.body.address,
    description: req.body.description,
  };

  const property = await updateProperty(req.params.id as string, dto);
  res.status(200).json({
    success: true,
    message: 'Property updated successfully',
    data: { property },
  });
};

export const deletePropertyController = async (req: Request, res: Response): Promise<void> => {
  await deleteProperty(req.params.id as string);
  res.status(200).json({ success: true, message: 'Property deleted successfully' });
};
```

### 7.3 `src/controllers/blocksController.ts`

```ts
import { Request, Response } from 'express';
import { createBlock, deleteBlock, updateBlock } from '../services/blocksService';
import { CreateBlockDto, UpdateBlockDto } from '../types';

export const createBlockController = async (req: Request, res: Response): Promise<void> => {
  const dto: CreateBlockDto = req.body;
  const block = await createBlock(req.params.propertyId as string, dto);
  res.status(201).json({ success: true, message: 'Block created successfully', data: { block } });
};

export const updateBlockController = async (req: Request, res: Response): Promise<void> => {
  const dto: UpdateBlockDto = req.body;
  const block = await updateBlock(req.params.id as string, dto);
  res.status(200).json({ success: true, message: 'Block updated successfully', data: { block } });
};

export const deleteBlockController = async (req: Request, res: Response): Promise<void> => {
  await deleteBlock(req.params.id as string);
  res.status(200).json({ success: true, message: 'Block deleted successfully' });
};
```

### 7.4 `src/controllers/unitsController.ts`

```ts
import { Request, Response } from 'express';
import {
  createUnit,
  deleteUnit,
  getUnitDetail,
  getUnits,
  updateUnit,
} from '../services/unitsService';
import { CreateUnitDto, GetUnitsQuery, UnitStatus, UpdateUnitDto } from '../types';

const parseLandArea = (value: unknown): number | undefined => {
  if (value === undefined || value === null || value === '') return undefined;
  const parsed = typeof value === 'number' ? value : parseFloat(String(value));
  return Number.isNaN(parsed) ? undefined : parsed;
};

export const getUnitsController = async (req: Request, res: Response): Promise<void> => {
  const query: GetUnitsQuery = {
    page: req.query.page ? parseInt(req.query.page as string, 10) : undefined,
    limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
    status: req.query.status as UnitStatus | undefined,
    search: req.query.search as string | undefined,
  };

  const result = await getUnits(req.params.blockId as string, query);
  res.status(200).json({ success: true, data: result });
};

export const getUnitDetailController = async (req: Request, res: Response): Promise<void> => {
  const unit = await getUnitDetail(req.params.id as string);
  res.status(200).json({ success: true, data: { unit } });
};

export const createUnitController = async (req: Request, res: Response): Promise<void> => {
  const dto: CreateUnitDto = {
    name: req.body.name,
    land_area: parseLandArea(req.body.land_area),
    status: req.body.status,
  };

  const unit = await createUnit(req.params.blockId as string, dto);
  res.status(201).json({ success: true, message: 'Unit created successfully', data: { unit } });
};

export const updateUnitController = async (req: Request, res: Response): Promise<void> => {
  const dto: UpdateUnitDto = {
    name: req.body.name,
    land_area: parseLandArea(req.body.land_area),
    status: req.body.status,
  };

  const unit = await updateUnit(req.params.id as string, dto);
  res.status(200).json({ success: true, message: 'Unit updated successfully', data: { unit } });
};

export const deleteUnitController = async (req: Request, res: Response): Promise<void> => {
  await deleteUnit(req.params.id as string);
  res.status(200).json({ success: true, message: 'Unit deleted successfully' });
};
```

---

## 8. Routes

### 8.1 `src/routes/authRoutes.ts`

```ts
import { Router } from 'express';
import { loginController, logoutController, meController } from '../controllers/authController';
import { authenticate } from '../middleware/auth/authenticate';
import { authLimiter } from '../middleware/rateLimiter';

const router = Router();

// POST /api/v1/auth/login  — public
router.post('/login', authLimiter, loginController);

// POST /api/v1/auth/logout — authenticated
router.post('/logout', authenticate, logoutController);

// GET  /api/v1/auth/me     — authenticated
router.get('/me', authenticate, meController);

export default router;
```

### 8.2 `src/routes/propertiesRoutes.ts`

```ts
import { Router } from 'express';
import {
  createPropertyController,
  deletePropertyController,
  getPropertiesController,
  getPropertyDetailController,
  updatePropertyController,
} from '../controllers/propertiesController';
import { authenticate } from '../middleware/auth/authenticate';

const router = Router();

router.get('/', authenticate, getPropertiesController);
router.get('/:id', authenticate, getPropertyDetailController);
router.post('/', authenticate, createPropertyController);
router.put('/:id', authenticate, updatePropertyController);
router.delete('/:id', authenticate, deletePropertyController);

export default router;
```

### 8.3 `src/routes/blocksRoutes.ts`

Mounted at the API root (`/api/v1`) so it can expose both property-scoped and block-scoped paths.

```ts
import { Router } from 'express';
import {
  createBlockController,
  deleteBlockController,
  updateBlockController,
} from '../controllers/blocksController';
import { authenticate } from '../middleware/auth/authenticate';

const router = Router();

router.post('/properties/:propertyId/blocks', authenticate, createBlockController);
router.put('/blocks/:id', authenticate, updateBlockController);
router.delete('/blocks/:id', authenticate, deleteBlockController);

export default router;
```

### 8.4 `src/routes/unitsRoutes.ts`

```ts
import { Router } from 'express';
import {
  createUnitController,
  deleteUnitController,
  getUnitDetailController,
  getUnitsController,
  updateUnitController,
} from '../controllers/unitsController';
import { authenticate } from '../middleware/auth/authenticate';

const router = Router();

router.get('/blocks/:blockId/units', authenticate, getUnitsController);
router.post('/blocks/:blockId/units', authenticate, createUnitController);
router.get('/units/:id', authenticate, getUnitDetailController);
router.put('/units/:id', authenticate, updateUnitController);
router.delete('/units/:id', authenticate, deleteUnitController);

export default router;
```

---

## 9. API reference

Base URL: `/api/v1`. All endpoints except `POST /auth/login` require the `access_token`
cookie. Request/response bodies are JSON (`Content-Type: application/json`).

### 9.1 Auth

| Method | Path | Auth | Body | Success |
| --- | --- | --- | --- | --- |
| POST | `/auth/login` | no | `{ email, password }` | `200 { success, message, data:{ user } }` + `access_token` cookie |
| POST | `/auth/logout` | yes | — | `200 { success, message }` (clears cookie) |
| GET | `/auth/me` | yes | — | `200 { success, data:{ user } }` |

**Login — `POST /api/v1/auth/login`**

```json
// request
{ "email": "admin@example.com", "password": "Admin123" }
```

```json
// 200 response (also sets httpOnly access_token cookie)
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "8f2c...",
      "full_name": "Admin User",
      "email": "admin@example.com",
      "phone": "6281234567800"
    }
  }
}
```

**Current user — `GET /api/v1/auth/me`**

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "8f2c...",
      "full_name": "Admin User",
      "email": "admin@example.com",
      "phone": "6281234567800"
    }
  }
}
```

### 9.2 Properties

| Method | Path | Query / Body | Success |
| --- | --- | --- | --- |
| GET | `/properties` | `page`, `limit`, `search`, `city` | `200 { data:{ properties, pagination } }` |
| GET | `/properties/:id` | — | `200 { data:{ property, blocks } }` |
| POST | `/properties` | `{ name, city, land_area?, address?, description? }` | `201 { data:{ property } }` |
| PUT | `/properties/:id` | any of the create fields | `200 { data:{ property } }` |
| DELETE | `/properties/:id` | — | `200 { message }` |

**List — `GET /api/v1/properties?page=1&limit=10&search=brassia&city=bekasi`**

```json
{
  "success": true,
  "data": {
    "properties": [
      {
        "id": "a1b2...",
        "name": "Brassia Garden",
        "city": "Bekasi",
        "land_area": 4564.0,
        "address": "Jl. Brassia Raya No. 1, Bekasi",
        "description": "Cluster modern dengan akses tol",
        "is_active": true,
        "total_blocks": 4,
        "total_units": 48,
        "created_at": "2026-01-01T00:00:00.000Z",
        "updated_at": "2026-01-01T00:00:00.000Z"
      }
    ],
    "pagination": { "page": 1, "limit": 10, "total_items": 1, "total_pages": 1 }
  }
}
```

**Detail — `GET /api/v1/properties/:id`**

```json
{
  "success": true,
  "data": {
    "property": { "id": "a1b2...", "name": "Brassia Garden", "city": "Bekasi", "land_area": 4564, "address": "...", "description": "...", "is_active": true, "created_at": "...", "updated_at": "..." },
    "blocks": [
      { "id": "b1...", "name": "Blok A", "is_active": true, "total_units": 11, "created_at": "...", "updated_at": "..." }
    ]
  }
}
```

### 9.3 Blocks

| Method | Path | Body | Success |
| --- | --- | --- | --- |
| POST | `/properties/:propertyId/blocks` | `{ name }` | `201 { data:{ block } }` |
| PUT | `/blocks/:id` | `{ name }` | `200 { data:{ block } }` |
| DELETE | `/blocks/:id` | — | `200 { message }` |

### 9.4 Units

| Method | Path | Query / Body | Success |
| --- | --- | --- | --- |
| GET | `/blocks/:blockId/units` | `page`, `limit`, `status`, `search` | `200 { data:{ block, units, pagination } }` |
| POST | `/blocks/:blockId/units` | `{ name, land_area?, status? }` | `201 { data:{ unit } }` |
| GET | `/units/:id` | — | `200 { data:{ unit } }` |
| PUT | `/units/:id` | `{ name?, land_area?, status? }` | `200 { data:{ unit } }` |
| DELETE | `/units/:id` | — | `200 { message }` |

**Units list — `GET /api/v1/blocks/:blockId/units?page=1&limit=20&status=available&search=A`**

```json
{
  "success": true,
  "data": {
    "block": { "id": "b1...", "name": "Blok A", "property_id": "a1b2...", "property_name": "Brassia Garden" },
    "units": [
      { "id": "u1...", "name": "A1", "land_area": 84.0, "status": "available", "created_at": "...", "updated_at": "..." },
      { "id": "u2...", "name": "A2", "land_area": 84.0, "status": "available", "created_at": "...", "updated_at": "..." }
    ],
    "pagination": { "page": 1, "limit": 20, "total_items": 8, "total_pages": 1 }
  }
}
```

---

## 10. Error codes

All errors use the envelope:

```json
{
  "success": false,
  "error": { "code": "VALIDATION_ERROR", "message": "Property name is required", "details": { "name": ["Property name is required"] } }
}
```

| Code | HTTP | When |
| --- | --- | --- |
| `VALIDATION_ERROR` | 400 | Missing/invalid fields, invalid status, empty update body. |
| `INVALID_CREDENTIALS` | 401 | Wrong email or password. |
| `UNAUTHORIZED` | 401 | Missing/invalid/expired token. |
| `ACCOUNT_INACTIVE` | 403 | `users.is_active = false`. |
| `NOT_FOUND` | 404 | Unknown route or entity. |
| `CONFLICT` | 409 | Duplicate block name (per property) or unit name (per block). |
| `RATE_LIMITED` | 429 | Rate limiter triggered. |
| `INTERNAL_ERROR` | 500 | Unexpected failure. |

---

## 11. Verification

```bash
cd property-management-be
npm install
npm run type-check     # tsc --noEmit, must pass
npm run lint           # eslint, must pass
npm run db:migrate     # apply schema + seeds
npm run dev            # start on :4000
curl -s localhost:4000/health
```
