/**
 * StudentPayload — Tipo del payload JWT emitido por el Auth_Service.
 *
 * Requisito 1.3, 1.5
 */
export interface StudentPayload {
  studentId: string;
  email: string;
  iat: number;
  exp: number;
}
