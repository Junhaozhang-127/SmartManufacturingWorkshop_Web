import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import {
  PrismaClientInitializationError,
  PrismaClientKnownRequestError,
  PrismaClientValidationError,
} from '@prisma/client/runtime/library';
import { StatusCode } from '@smw/shared';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const context = host.switchToHttp();
    const response = context.getResponse<{ status: (code: number) => void; json: (payload: unknown) => void }>();
    const request = context.getRequest<{ requestId?: string }>();

    const isDatabaseUnavailable = exception instanceof PrismaClientInitializationError;
    const isDatabaseRequestError = exception instanceof PrismaClientKnownRequestError;
    const isDatabaseValidationError = exception instanceof PrismaClientValidationError;

    const status = exception instanceof HttpException
      ? exception.getStatus()
      : isDatabaseUnavailable
        ? HttpStatus.SERVICE_UNAVAILABLE
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message = (() => {
      if (exception instanceof HttpException) {
        const payload = exception.getResponse();
        if (typeof payload === 'string') return payload;
        if (payload && typeof payload === 'object' && 'message' in payload) {
          const maybeMessage = (payload as { message?: unknown }).message;
          if (Array.isArray(maybeMessage)) return maybeMessage.join('；');
          if (typeof maybeMessage === 'string' && maybeMessage.trim()) return maybeMessage;
        }
        return exception.message;
      }

      if (isDatabaseUnavailable) {
        return '数据库连接失败，请确认 MySQL 服务已启动且 DATABASE_URL 配置正确';
      }

      if (isDatabaseRequestError || isDatabaseValidationError) {
        return '数据库请求失败，请检查初始化数据和表结构';
      }

      return 'Internal server error';
    })();

    const code = (() => {
      if (status === HttpStatus.UNAUTHORIZED) return StatusCode.UNAUTHORIZED;
      if (status === HttpStatus.FORBIDDEN) return StatusCode.FORBIDDEN;
      if (status === HttpStatus.NOT_FOUND) return StatusCode.NOT_FOUND;
      if (status === HttpStatus.BAD_REQUEST) return StatusCode.BAD_REQUEST;
      if (status === HttpStatus.UNPROCESSABLE_ENTITY) return StatusCode.VALIDATION_ERROR;
      if (status === HttpStatus.SERVICE_UNAVAILABLE) return StatusCode.SERVICE_UNAVAILABLE;
      return StatusCode.INTERNAL_ERROR;
    })();

    response.status(status);
    response.json({
      code,
      message,
      data: null,
      timestamp: new Date().toISOString(),
      requestId: request.requestId,
    });
  }
}
