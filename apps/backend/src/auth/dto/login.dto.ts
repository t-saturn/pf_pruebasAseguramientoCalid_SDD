/**
 * LoginDto — DTO para el endpoint POST /api/v1/auth/login.
 *
 * Valida:
 *  - email: cadena con formato de correo electrónico válido.
 *  - password: cadena no vacía.
 *
 * Requisito 1.3, 1.4
 */
import { IsEmail, IsString, IsNotEmpty } from 'class-validator';

export class LoginDto {
  @IsEmail({}, { message: 'El email debe ser una dirección de correo válida.' })
  email!: string;

  @IsString()
  @IsNotEmpty({ message: 'La contraseña no puede estar vacía.' })
  password!: string;
}
