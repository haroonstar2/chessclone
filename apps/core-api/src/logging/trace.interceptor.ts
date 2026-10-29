import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import type { IncomingMessage } from 'node:http';
import { PinoLogger } from 'nestjs-pino';
import { traceFields } from './logging.config.js';

@Injectable()
export class TraceInterceptor implements NestInterceptor {
  constructor(private readonly logger: PinoLogger) {}

  intercept(context: ExecutionContext, next: CallHandler) {
    const request = context.switchToHttp().getRequest<IncomingMessage>();

    // Guards have verified the user's identity before interceptors execute.
    this.logger.assign(traceFields(request));

    return next.handle();
  }
}
