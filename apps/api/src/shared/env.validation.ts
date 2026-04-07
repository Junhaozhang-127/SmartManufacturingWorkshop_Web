import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  APP_NAME: z.string().default('Smart Manufacturing Workshop Lab System'),
  APP_PORT: z.coerce.number().default(3000),
  API_PREFIX: z.string().default('api'),
  DATABASE_URL: z.string().default('mysql://root:root@127.0.0.1:3306/smw_lab'),
  REDIS_HOST: z.string().optional(),
  REDIS_PORT: z.coerce.number().default(6379),
  MINIO_ENDPOINT: z.string().optional(),
  MINIO_PORT: z.coerce.number().default(9000),
  MINIO_BUCKET: z.string().optional(),
});

export function validateEnv(config: Record<string, unknown>) {
  return envSchema.parse(config);
}
