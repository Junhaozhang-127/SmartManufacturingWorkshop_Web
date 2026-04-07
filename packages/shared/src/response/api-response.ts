import { StatusCode } from '../constants/status-code';

export interface ApiResponse<T> {
  code: StatusCode | number;
  message: string;
  data: T;
  timestamp: string;
  requestId?: string;
}

export function createApiResponse<T>(
  data: T,
  message = 'ok',
  code: StatusCode | number = StatusCode.SUCCESS,
  requestId?: string,
): ApiResponse<T> {
  return {
    code,
    message,
    data,
    timestamp: new Date().toISOString(),
    requestId,
  };
}
