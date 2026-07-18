/**
 * AuthModule — Módulo NestJS del Auth_Service.
 *
 * Registra:
 *  - AuthController: endpoints POST /register y POST /login.
 *  - AuthService: lógica de registro, login y validateToken.
 *  - JwtModule.registerAsync: configurado con JWT_SECRET desde ConfigService.
 *
 * PrismaModule se importa desde PrismaModule (global), no se reimporta aquí.
 *
 * Requisitos: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6
 */
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

@Module({
  imports: [
    // JwtModule configured async to read JWT_SECRET from environment — Requisito 1.3
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '24h', algorithm: 'HS256' },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService],
  // Export AuthService and JwtModule so other modules can use validateToken and JwtService
  exports: [AuthService, JwtModule],
})
export class AuthModule {}
