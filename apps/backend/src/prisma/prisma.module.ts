/**
 * PrismaModule — módulo global que provee PrismaService a toda la aplicación.
 * Al marcarse como @Global(), no es necesario importarlo en cada módulo;
 * PrismaService queda disponible en el contenedor DI de NestJS globalmente.
 *
 * Requisito 7.5
 */
import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
