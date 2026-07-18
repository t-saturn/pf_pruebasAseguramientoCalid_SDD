/**
 * ResponseInterceptor — envuelve todas las respuestas exitosas en el envelope
 * estándar: { data: <respuesta original>, error: null, status: <código HTTP> }.
 *
 * Se aplica globalmente para garantizar que todas las respuestas exitosas del
 * API_Gateway tengan una estructura consistente.
 *
 * Requisitos: 9.4, 9.5
 */
import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Response } from 'express';

export interface ApiEnvelope<T> {
  data: T;
  error: null;
  status: number;
}

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, ApiEnvelope<T>> {
  intercept(context: ExecutionContext, next: CallHandler<T>): Observable<ApiEnvelope<T>> {
    const httpContext = context.switchToHttp();
    const response = httpContext.getResponse<Response>();

    return next.handle().pipe(
      map((data) => ({
        data,
        error: null,
        status: response.statusCode,
      })),
    );
  }
}
