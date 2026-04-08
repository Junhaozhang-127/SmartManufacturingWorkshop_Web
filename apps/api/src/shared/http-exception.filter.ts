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

    const message = exception instanceof HttpException
      ? exception.message
      : isDatabaseUnavailable
        ? '数据库连接失败，请确认 MySQL 服务已启动且 DATABASE_URL 配置正确'
        : isDatabaseRequestError || isDatabaseValidationError
          ? '数据库请求失败，请检查初始化数据和表结构'
          : 'Internal server error';

    const code =
      status === HttpStatus.UNAUTHORIZED
        ? StatusCode.UNAUTHORIZED
        : status === HttpStatus.FORBIDDEN
          ? StatusCode.FORBIDDEN
          : status === HttpStatus.NOT_FOUND
            ? StatusCode.NOT_FOUND
            : status === HttpStatus.BAD_REQUEST
              ? StatusCode.BAD_REQUEST
              : status === HttpStatus.SERVICE_UNAVAILABLE
                ? StatusCode.INTERNAL_ERROR
                : StatusCode.INTERNAL_ERROR;

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
