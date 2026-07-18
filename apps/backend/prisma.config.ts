/**
 * Prisma CLI configuration — Prisma 7 requirement.
 * The datasource URL is defined here instead of schema.prisma.
 *
 * Connection pool is configured via DATABASE_URL query params:
 *   ?connection_limit=10&pool_timeout=20
 * This sets pool max to 10; Prisma maintains min 2 idle connections.
 *
 * Requisito 7.5
 */
import 'dotenv/config';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    // DATABASE_URL must include pool params, e.g.:
    // postgresql://user:pass@host:5432/mindflow?connection_limit=10&pool_timeout=20
    url: process.env['DATABASE_URL'] ?? '',
  },
});
