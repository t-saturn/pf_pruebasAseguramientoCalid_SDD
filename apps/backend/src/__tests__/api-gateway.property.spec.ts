/**
 * Property-based tests for the NestJS API Gateway.
 *
 * Property 22: API Response Structure Invariant
 *   Every response from the API_Gateway MUST contain the fields `data`, `error`,
 *   and `status`, regardless of the HTTP status code (200, 400, 404, 422, etc.).
 *   Validates: Requirements 9.4, 9.5
 *
 * Property 23: Route Versioning under /api/v1/
 *   All routes registered in the NestJS router MUST start with the `/api/v1/`
 *   prefix, or routes without that prefix MUST return 404.
 *   Validates: Requirement 9.3
 */
import * as fc from 'fast-check';
import { Test, TestingModule } from '@nestjs/testing';
import {
  Controller,
  Get,
  Module,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ValidationPipe } from '@nestjs/common';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const supertest = require('supertest') as typeof import('supertest');
import { INestApplication } from '@nestjs/common';
import { GlobalExceptionFilter } from '../common/filters';
import { ResponseInterceptor } from '../common/interceptors';

// ─── Minimal test controllers ──────────────────────────────────────────────
// We use a minimal app (no DB) to test the filter/interceptor layer in isolation.

@Controller('test')
class TestController {
  @Get('ok')
  getOk(): { message: string } {
    return { message: 'hello' };
  }

  @Get('not-found')
  getNotFound(): never {
    throw new HttpException('Not found', HttpStatus.NOT_FOUND);
  }

  @Get('bad-request')
  getBadRequest(): never {
    throw new HttpException('Bad request', HttpStatus.BAD_REQUEST);
  }

  @Get('server-error')
  getServerError(): never {
    throw new Error('Unexpected internal error');
  }
}

@Module({
  controllers: [TestController],
})
class TestAppModule {}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function buildTestApp(): Promise<INestApplication> {
  const moduleRef: TestingModule = await Test.createTestingModule({
    imports: [TestAppModule],
  }).compile();

  const app = moduleRef.createNestApplication();

  // Register same global setup as main.ts (without helmet/CORS/DB)
  app.setGlobalPrefix('api/v1');
  app.useGlobalFilters(new GlobalExceptionFilter());
  app.useGlobalInterceptors(new ResponseInterceptor());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      errorHttpStatusCode: 422,
    }),
  );

  await app.init();
  return app;
}

function hasEnvelopeShape(body: unknown): boolean {
  if (typeof body !== 'object' || body === null) return false;
  const b = body as Record<string, unknown>;
  return 'data' in b && 'error' in b && 'status' in b;
}

// ─── Test suite ───────────────────────────────────────────────────────────────

describe('API Gateway — Property 22: Response Structure Invariant', () => {
  /**
   * Validates: Requirements 9.4, 9.5
   */
  let app: INestApplication;

  beforeAll(async () => {
    app = await buildTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('P22 — should always return envelope for 200 OK response', async () => {
    const res = await supertest(app.getHttpServer())
      .get('/api/v1/test/ok')
      .expect(200);

    expect(hasEnvelopeShape(res.body)).toBe(true);
    expect(res.body.error).toBeNull();
    expect(res.body.status).toBe(200);
    expect(res.body.data).toEqual({ message: 'hello' });
  });

  it('P22 — should always return envelope for 404 Not Found', async () => {
    const res = await supertest(app.getHttpServer())
      .get('/api/v1/test/not-found')
      .expect(404);

    expect(hasEnvelopeShape(res.body)).toBe(true);
    expect(res.body.data).toBeNull();
    expect(typeof res.body.error).toBe('string');
    expect(res.body.status).toBe(404);
  });

  it('P22 — should always return envelope for 400 Bad Request', async () => {
    const res = await supertest(app.getHttpServer())
      .get('/api/v1/test/bad-request')
      .expect(400);

    expect(hasEnvelopeShape(res.body)).toBe(true);
    expect(res.body.data).toBeNull();
    expect(typeof res.body.error).toBe('string');
    expect(res.body.status).toBe(400);
  });

  it('P22 — should always return envelope for 500 Internal Server Error', async () => {
    const res = await supertest(app.getHttpServer())
      .get('/api/v1/test/server-error')
      .expect(500);

    expect(hasEnvelopeShape(res.body)).toBe(true);
    expect(res.body.data).toBeNull();
    expect(typeof res.body.error).toBe('string');
    expect(res.body.status).toBe(500);
  });

  it('P22 — property: all known routes return envelope regardless of outcome', async () => {
    /**
     * Validates: Requirements 9.4, 9.5
     *
     * We generate random selections from the known test routes and verify
     * the invariant holds for every combination.
     */
    const knownRoutes = [
      { path: '/api/v1/test/ok', expectedStatus: 200 },
      { path: '/api/v1/test/not-found', expectedStatus: 404 },
      { path: '/api/v1/test/bad-request', expectedStatus: 400 },
      { path: '/api/v1/test/server-error', expectedStatus: 500 },
    ];

    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(...knownRoutes),
        async (route) => {
          const res = await supertest(app.getHttpServer())
            .get(route.path);

          // The envelope MUST be present regardless of status code
          expect(hasEnvelopeShape(res.body)).toBe(true);
          expect(res.body.status).toBe(route.expectedStatus);
          expect('data' in res.body).toBe(true);
          expect('error' in res.body).toBe(true);
        },
      ),
      { numRuns: 50 },
    );
  });

  it('P22 — property: random invalid route suffixes return 404 envelope', async () => {
    /**
     * Validates: Requirements 9.4, 9.5
     *
     * Generate random path suffixes. Since these routes don't exist,
     * NestJS returns 404 — but the filter must still wrap it in the envelope.
     */
    await fc.assert(
      fc.asyncProperty(
        // Generate safe, URL-compatible path-like strings
        fc.stringOf(
          fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz0123456789-_'.split('')),
          { minLength: 1, maxLength: 20 },
        ),
        async (randomSuffix) => {
          const res = await supertest(app.getHttpServer())
            .get(`/api/v1/nonexistent/${randomSuffix}`);

          expect(res.status).toBe(404);
          expect(hasEnvelopeShape(res.body)).toBe(true);
          expect(res.body.data).toBeNull();
          expect(typeof res.body.error).toBe('string');
          expect(res.body.status).toBe(404);
        },
      ),
      { numRuns: 30 },
    );
  });
});

describe('API Gateway — Property 23: Route Versioning under /api/v1/', () => {
  /**
   * Validates: Requirement 9.3
   */
  let app: INestApplication;

  beforeAll(async () => {
    app = await buildTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('P23 — routes without /api/v1/ prefix return 404', async () => {
    // Routes that would exist without prefix must NOT be accessible directly
    const unversionedPaths = [
      '/test/ok',
      '/test/not-found',
      '/test/bad-request',
    ];

    for (const path of unversionedPaths) {
      const res = await supertest(app.getHttpServer()).get(path);
      expect(res.status).toBe(404);
    }
  });

  it('P23 — routes with /api/v1/ prefix are accessible', async () => {
    const res = await supertest(app.getHttpServer())
      .get('/api/v1/test/ok')
      .expect(200);

    expect(res.body.data).toBeDefined();
  });

  it('P23 — property: all valid routes must be under /api/v1/ prefix', async () => {
    /**
     * Validates: Requirement 9.3
     *
     * We verify that accessing the same paths WITHOUT the /api/v1/ prefix
     * consistently returns 404, proving that the prefix is mandatory for routing.
     *
     * Only routes whose handler returns 2xx are tested here to distinguish
     * "NestJS router has no matching path" (404) from "handler deliberately
     * returns an error status". The key invariant: with the prefix the route is
     * reachable, without it NestJS returns 404 because no path is registered.
     */
    const successRoutes = ['test/ok'];

    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(...successRoutes),
        async (subPath) => {
          // Without prefix → must be 404 (no route registered at this path)
          const resWithout = await supertest(app.getHttpServer())
            .get(`/${subPath}`);
          expect(resWithout.status).toBe(404);

          // With prefix → route is registered and handler returns 200
          const resWith = await supertest(app.getHttpServer())
            .get(`/api/v1/${subPath}`);
          expect(resWith.status).toBe(200);
        },
      ),
      { numRuns: 20 },
    );
  });

  it('P23 — property: random paths without /api/v1 prefix always return 404', async () => {
    /**
     * Validates: Requirement 9.3
     *
     * Any path that does NOT start with /api/v1 should return 404.
     */
    const validPrefixes = ['/api/v1/', '/api/v1'];

    await fc.assert(
      fc.asyncProperty(
        fc.stringOf(
          fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz0123456789-_/'.split('')),
          { minLength: 1, maxLength: 30 },
        ),
        async (randomPath) => {
          // Skip if it accidentally starts with the valid prefix
          const normalized = randomPath.startsWith('/') ? randomPath : `/${randomPath}`;
          const hasValidPrefix = validPrefixes.some((p) => normalized.startsWith(p));
          if (hasValidPrefix) return;

          const res = await supertest(app.getHttpServer()).get(normalized);
          expect(res.status).toBe(404);
        },
      ),
      { numRuns: 30 },
    );
  });
});
