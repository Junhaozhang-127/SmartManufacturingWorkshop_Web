import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  APP_NAME: z.string().default('Smart Manufacturing Workshop Lab System'),
  APP_PORT: z.coerce.number().default(3000),
  APP_BASE_URL: z.string().default('http://localhost:3000'),
  API_PREFIX: z.string().default('api'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  AUTH_TOKEN_SECRET: z.string().min(16, 'AUTH_TOKEN_SECRET must be at least 16 chars'),
  AUTH_TOKEN_TTL_SECONDS: z.coerce.number().default(28800),
  CORS_ALLOWED_ORIGINS: z.string().optional(),
  CORS_ALLOW_CREDENTIALS: z.enum(['true', 'false']).optional(),
  HEALTH_EXPOSE_DETAILS: z.enum(['true', 'false']).optional(),
  REDIS_HOST: z.string().optional(),
  REDIS_PORT: z.coerce.number().default(6379),
  MINIO_ENDPOINT: z.string().optional(),
  MINIO_PORT: z.coerce.number().default(9000),
  MINIO_BUCKET: z.string().optional(),
  MINIO_ACCESS_KEY: z.string().optional(),
  MINIO_SECRET_KEY: z.string().optional(),
});

export function validateEnv(config: Record<string, unknown>) {
  const parsed = envSchema.parse(config);

  if (parsed.NODE_ENV === 'production') {
    if (parsed.AUTH_TOKEN_SECRET.length < 32) {
      throw new Error('AUTH_TOKEN_SECRET must be at least 32 chars in production');
    }

    if (parsed.HEALTH_EXPOSE_DETAILS === 'true') {
      throw new Error('HEALTH_EXPOSE_DETAILS must not be enabled in production');
    }
  }

  return parsed;
}
