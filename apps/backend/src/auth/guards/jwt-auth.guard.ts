/**
 * JwtAuthGuard — Guard global de autenticación JWT.
 *
 * Verifica el token Bearer en el header Authorization para todas las rutas,
 * excepto aquellas marcadas con el decorador @Public() o que coincidan con
 * las rutas públicas explícitas (register y login).
 *
 * Rutas públicas explícitas:
 *  - POST /api/v1/auth/register
 *  - POST /api/v1/auth/login
 *
 * Requisitos: 1.5, 1.6
 */
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { StudentPayload } from '../interfaces/student-payload.interface';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly reflector: Reflector,
    private readonly configService: ConfigService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    // Check @Public() decorator on handler or class
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();

    // Explicit public path check (belt-and-suspenders)
    const method = request.method.toUpperCase();
    const path = request.path;

    if (
      (method === 'POST' && path === '/api/v1/auth/register') ||
      (method === 'POST' && path === '/api/v1/auth/login')
    ) {
      return true;
    }

    // Extract and verify JWT
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException(
        'Token de autenticación requerido. Por favor, inicie sesión.',
      );
    }

    try {
      const secret = this.configService.get<string>('JWT_SECRET');
      const payload = this.jwtService.verify<StudentPayload>(token, { secret });

      // Attach payload to request for downstream use
      (request as Request & { user: StudentPayload }).user = payload;
      return true;
    } catch {
      throw new UnauthorizedException(
        'Token de autenticación inválido o expirado. Por favor, inicie sesión nuevamente.',
      );
    }
  }

  private extractTokenFromHeader(request: Request): string | null {
    const authHeader = request.headers['authorization'];
    if (!authHeader || typeof authHeader !== 'string') {
      return null;
    }

    const [scheme, token] = authHeader.split(' ');
    if (scheme?.toLowerCase() !== 'bearer' || !token) {
      return null;
    }

    return token;
  }
}
