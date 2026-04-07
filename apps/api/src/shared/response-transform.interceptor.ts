import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { createApiResponse,StatusCode } from '@smw/shared';
import { map } from 'rxjs/operators';

function serialize(value: unknown): unknown {
  if (typeof value === 'bigint') {
    return value.toString();
  }

  if (Array.isArray(value)) {
    return value.map(serialize);
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, entryValue]) => [key, serialize(entryValue)]),
    );
  }

  return value;
}

@Injectable()
export class ResponseTransformInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler) {
    const request = context.switchToHttp().getRequest<{ requestId?: string }>();

    return next.handle().pipe(
      map((data: unknown) =>
        createApiResponse(serialize(data), 'ok', StatusCode.SUCCESS, request.requestId),
      ),
    );
  }
}
