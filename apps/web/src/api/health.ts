import { http } from './client';

export interface HealthResult {
  app: {
    status: string;
    name: string;
    now: string;
  };
  dependencies: {
    database: {
      status: string;
      message: string;
    };
    redis: {
      configured: boolean;
      host: string | null;
    };
    minio: {
      configured: boolean;
      endpoint: string | null;
      bucket: string | null;
    };
  };
}

export async function fetchHealth() {
  return http.get<never, { data: HealthResult }>('/health');
}
