/**
 * @Public() — Decorador para marcar rutas como públicas (sin autenticación JWT).
 *
 * Usado por JwtAuthGuard para decidir si omitir la verificación del token.
 *
 * Requisito 1.5, 1.6
 */
import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

export const Public = (): ReturnType<typeof SetMetadata> =>
  SetMetadata(IS_PUBLIC_KEY, true);
