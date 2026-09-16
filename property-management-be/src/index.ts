import http from 'http';
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
import { getAllowedOrigins } from './config/cors';
import { testConnection, closePool } from './config/database';
import { initSocketServer } from './socket/server';
import authRoutes from './routes/authRoutes';
import propertiesRoutes from './routes/propertiesRoutes';
import blocksRoutes from './routes/blocksRoutes';
import unitsRoutes from './routes/unitsRoutes';
import conversationsRoutes from './routes/conversationsRoutes';
import messagesRoutes from './routes/messagesRoutes';
import leadsRoutes from './routes/leadsRoutes';
import settingsRoutes from './routes/settingsRoutes';
import ragRoutes from './routes/ragRoutes';
import webhookRoutes from './routes/webhookRoutes';

dotenv.config();

const app: Application = express();
const PORT = process.env.APP_PORT || 4000;
const API_VERSION = '/api/v1';

app.set('trust proxy', 1);

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

// The Meta webhook must not be rate-limited aggressively (Meta retries).
app.use(`${API_VERSION}/webhook`, webhookRoutes);

app.use(`${API_VERSION}`, generalLimiter);
app.use(`${API_VERSION}/auth`, authRoutes);
app.use(`${API_VERSION}/properties`, propertiesRoutes);
app.use(`${API_VERSION}`, blocksRoutes);
app.use(`${API_VERSION}`, unitsRoutes);
app.use(`${API_VERSION}/conversations`, conversationsRoutes);
app.use(`${API_VERSION}/messages`, messagesRoutes);
app.use(`${API_VERSION}`, leadsRoutes);
app.use(`${API_VERSION}`, settingsRoutes);
app.use(`${API_VERSION}`, ragRoutes);

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

  const httpServer = http.createServer(app);
  initSocketServer(httpServer);

  httpServer.listen(PORT, () => {
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
