/**
 * Middleware de Next.js para proteger rutas autenticadas.
 *
 * Rutas protegidas:
 *  - /dashboard  — Panel principal del estudiante (Requisito 5.1)
 *  - /ema        — Flujo del chatbot EMA (Requisito 3.1)
 *
 * Auth.js valida su cookie de sesión cifrada y redirige al login cuando falta.
 *
 * Requisitos: 1.5, 5.1, 9.3
 */

export { auth as middleware } from '@/auth';

/** Configuración del matcher para ejecutar el middleware sólo en rutas relevantes. */
export const config = {
  matcher: ['/dashboard/:path*', '/ema/:path*'],
};
