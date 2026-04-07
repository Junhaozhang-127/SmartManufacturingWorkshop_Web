import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { StatusCode } from '@smw/shared';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const context = host.switchToHttp();
    const response = context.getResponse<{ status: (code: number) => void; json: (payload: unknown) => void }>();
    const request = context.getRequest<{ requestId?: string }>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException ? exception.message : 'Internal server error';

    const code =
      status === HttpStatus.UNAUTHORIZED
        ? StatusCode.UNAUTHORIZED
        : status === HttpStatus.FORBIDDEN
          ? StatusCode.FORBIDDEN
          : status === HttpStatus.NOT_FOUND
            ? StatusCode.NOT_FOUND
            : status === HttpStatus.BAD_REQUEST
              ? StatusCode.BAD_REQUEST
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
