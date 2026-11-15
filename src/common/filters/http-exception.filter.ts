import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import type { ApiErrorResponse } from '../interfaces/api-response.interface.js';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let errorName = 'InternalServerError';
    let details: unknown = null;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      if (typeof res === 'string') {
        message = res;
        errorName = exception.name;
      } else if (typeof res === 'object' && res !== null) {
        const r = res as Record<string, unknown>;
        message = (r['message'] as string) || exception.message;
        errorName = (r['error'] as string) || exception.name;
        details = Array.isArray(r['message']) ? r['message'] : (r['details'] ?? null);
        if (Array.isArray(r['message'])) {
          message = 'Validation failed';
        }
      }
    } else if (exception instanceof Error) {
      // Don't leak raw internal server error details in production
      const isProduction = process.env.NODE_ENV === 'production';
      message = isProduction ? 'An unexpected error occurred' : exception.message;
      errorName = exception.name;
      this.logger.error(`Unhandled Exception: ${exception.message}`, exception.stack);
    }

    const errorResponse: ApiErrorResponse = {
      success: false,
      message,
      statusCode: status,
      error: errorName,
      details: details ?? undefined,
      timestamp: new Date().toISOString(),
      path: request.originalUrl || request.url,
    };

    response.status(status).json(errorResponse);
  }
}
