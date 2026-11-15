import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import type { ApiResponse } from '../interfaces/api-response.interface.js';
import type { Response } from 'express';

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, ApiResponse<T> | T> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<ApiResponse<T> | T> {
    const ctx = context.switchToHttp();
    const response = ctx.getResponse<Response>();

    return next.handle().pipe(
      map((data) => {
        // If response is already streamed, sent, or raw binary/buffer (e.g. PDF/Excel download)
        if (
          response.headersSent ||
          Buffer.isBuffer(data) ||
          (data && typeof data.pipe === 'function')
        ) {
          return data;
        }

        // If the handler already returned an ApiResponse format
        if (data && typeof data === 'object' && 'success' in data && 'message' in data) {
          if (!data.meta) {
            data.meta = { timestamp: new Date().toISOString() };
          } else if (!data.meta.timestamp) {
            data.meta.timestamp = new Date().toISOString();
          }
          return data;
        }

        // If data contains { items, total, page, limit, totalPages } - pagination format
        if (
          data &&
          typeof data === 'object' &&
          'items' in data &&
          'total' in data &&
          'page' in data
        ) {
          const { items, ...metaProps } = data;
          return {
            success: true,
            message: 'Records retrieved successfully',
            data: items,
            meta: {
              ...metaProps,
              timestamp: new Date().toISOString(),
            },
          };
        }

        return {
          success: true,
          message: 'Operation completed successfully',
          data: data ?? null,
          meta: {
            timestamp: new Date().toISOString(),
          },
        };
      }),
    );
  }
}
