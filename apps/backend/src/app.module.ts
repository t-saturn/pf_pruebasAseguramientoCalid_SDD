/**
 * Módulo raíz de la aplicación NestJS MindFlow.
 * Registra los módulos de cada dominio y la configuración de variables de entorno.
 */
import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';

@Module({
  imports: [
    // Carga variables de entorno desde .env — Requisito 8.4
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    // Módulo global de base de datos — Requisito 7.5
    PrismaModule,
    // Auth_Service — Requisitos 1.1–1.6
    AuthModule,
    // Los siguientes módulos se registrarán en tareas subsiguientes:
    // TaskModule, SessionModule, TaskDecomposerModule,
    // SessionSerializerModule, NotificationModule, DBWriterModule
  ],
  controllers: [],
  providers: [
    // Registro global del JWT guard — Requisito 1.5, 1.6
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
