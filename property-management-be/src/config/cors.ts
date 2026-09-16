export const getAllowedOrigins = (): string | string[] => {
  const corsOrigin = process.env.CORS_ORIGIN;
  if (!corsOrigin) {
    return process.env.NODE_ENV === 'production' ? [] : 'http://localhost:3000';
  }
  return corsOrigin.split(',').map((origin) => origin.trim());
};
