/**
 * AuthController — Controlador HTTP del Auth_Service.
 *
 * Expone:
 *  - POST /api/v1/auth/register  → público
 *  - POST /api/v1/auth/login     → público
 *
 * Ambas rutas están marcadas con @Public() para excluirlas del JwtAuthGuard global.
 *
 * Requisitos: 1.1, 1.2, 1.3, 1.4
 */
import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto, LoginDto } from './dto';
import { Public } from './decorators/public.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * POST /api/v1/auth/register
   *
   * Crea una nueva cuenta de Student.
   * Retorna 201 con mensaje de confirmación.
   * Retorna 409 si el email ya está registrado.
   * Retorna 422 si el payload es inválido (email malformado, contraseña < 8 chars).
   *
   * Requisito 1.1, 1.2
   */
  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(
    @Body() dto: RegisterDto,
  ): Promise<{ message: string }> {
    return this.authService.register(dto.email, dto.password);
  }

  /**
   * POST /api/v1/auth/login
   *
   * Autentica un Student y retorna JWT con expiración de 24h.
   * Retorna 200 con { token } si las credenciales son válidas.
   * Retorna 401 genérico si las credenciales son inválidas.
   *
   * Requisito 1.3, 1.4
   */
  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: LoginDto,
  ): Promise<{ token: string }> {
    return this.authService.login(dto.email, dto.password);
  }
}
