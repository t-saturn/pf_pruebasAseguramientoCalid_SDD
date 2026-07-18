/**
 * RegisterDto — DTO para el endpoint POST /api/v1/auth/register.
 *
 * Valida:
 *  - email: cadena con formato de correo electrónico válido.
 *  - password: cadena de al menos 8 caracteres.
 *
 * Requisito 1.1, 1.2
 */
import { IsEmail, IsString, MinLength } from 'class-validator';

export class RegisterDto {
  @IsEmail({}, { message: 'El email debe ser una dirección de correo válida.' })
  email!: string;

  @IsString()
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres.' })
  password!: string;
}
