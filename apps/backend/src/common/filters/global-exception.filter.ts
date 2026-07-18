/**
 * GlobalExceptionFilter — transforma todas las excepciones no capturadas
 * al envelope estándar: { data: null, error: string, status: number }.
 *
 * Maneja:
 *  - HttpException (incluyendo errores de ValidationPipe): extrae status y mensaje.
 *  - Errores desconocidos: devuelve HTTP 500 con mensaje genérico.
 *
 * Requisitos: 9.4, 9.5
 */
import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status: number;
    let error: string;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const responseBody = exception.getResponse();

      if (typeof responseBody === 'string') {
        error = responseBody;
      } else if (typeof responseBody === 'object' && responseBody !== null) {
        const body = responseBody as Record<string, unknown>;
        // ValidationPipe emite message como array de strings
        if (Array.isArray(body['message'])) {
          error = (body['message'] as string[]).join('; ');
        } else if (typeof body['message'] === 'string') {
          error = body['message'];
        } else {
          error = exception.message;
        }
      } else {
        error = exception.message;
      }
    } else {
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      error = 'Error interno del servidor.';
    }

    response.status(status).json({
      data: null,
      error,
      status,
    });
  }
}
