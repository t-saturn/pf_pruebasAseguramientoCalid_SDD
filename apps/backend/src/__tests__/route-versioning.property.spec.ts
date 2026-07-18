/**
 * Property-based test for the NestJS API Gateway.
 *
 * Property 23: Versionado de Rutas bajo /api/v1/
 *   Para todo endpoint registrado en el API_Gateway, la ruta completa
 *   DEBERÁ comenzar con el prefijo literal `/api/v1/`, sin excepción
 *   para ningún recurso ni subrecurso del sistema.
 *
 * **Validates: Requisito 9.3**
 *
 * Strategy:
 *  1. Bootstrap a minimal NestJS application that mirrors the real app structure
 *     (uses the same controllers registered in AppModule but mocks the DB layer).
 *  2. Apply `app.setGlobalPrefix('api/v1')` exactly as main.ts does.
 *  3. Introspect the actual registered routes from the Express router stack
 *     after the app has initialised — no hardcoding.
 *  4. Run fc.assert / fc.property over the collected route set to verify
 *     that every route path starts with the literal `/api/v1/` prefix.
 */

import * as fc from 'fast-check';
import { Test, TestingModule } from '@nestjs/testing';
import {
  Controller,
  Delete,
  Get,
  Module,
  Patch,
  Post,
} from '@nestjs/common';
import { INestApplication } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from '../auth/auth.controller';
import { AuthService } from '../auth/auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GlobalExceptionFilter } from '../common/filters';
import { ResponseInterceptor } from '../common/interceptors';

// ─── Route extraction helper ──────────────────────────────────────────────────

interface RegisteredRoute {
  method: string;
  path: string;
}

/**
 * Extracts all routes registered in the NestJS/Express application.
 *
 * NestJS uses Express under the hood. After `app.init()` the underlying
 * http.Server exposes the Express app via `_events.request`. The Express
 * Router is accessible at `._router.stack` (or `router.stack` on newer
 * Express versions). Each layer has a `route` property with `.path` and
 * `.methods`.
 *
 * This function walks the stack recursively and collects every concrete
 * route (i.e. layers that have a non-null `.route`).
 */
function extractRoutes(app: INestApplication): RegisteredRoute[] {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any
  const server: any = app.getHttpServer();

  // Express attaches the router to server._events.request (Express app function)
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
  const expressApp = server._events?.request ?? server._events?.['request'];
  if (!expressApp) {
    throw new Error('Could not retrieve Express app from http.Server._events.request');
  }

  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
  const router = expressApp._router ?? expressApp.router;
  if (!router) {
    throw new Error('Could not retrieve Express Router from the application');
  }

  const routes: RegisteredRoute[] = [];

  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
  const stack: unknown[] = router.stack ?? [];

  for (const layer of stack) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment
    const l = layer as any;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    if (l.route && l.route.path) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      const path: string = l.route.path as string;
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      const methods: Record<string, boolean> = l.route.methods as Record<string, boolean>;
      for (const method of Object.keys(methods)) {
        if (methods[method]) {
          routes.push({ method: method.toUpperCase(), path });
        }
      }
    }
  }

  return routes;
}

// ─── Minimal mock for PrismaService ──────────────────────────────────────────
// Avoids real DB connections during the test setup.

const mockPrismaService = {
  onModuleInit: jest.fn(),
  onModuleDestroy: jest.fn(),
  $connect: jest.fn(),
  $disconnect: jest.fn(),
};

// ─── Minimal test module ─────────────────────────────────────────────────────

/**
 * A lightweight NestJS module that mirrors the real AppModule structure:
 * - Registers the AuthController (same as prod).
 * - Mocks PrismaService so no DB connection is attempted.
 * - Registers the JWT guard globally (same as prod).
 *
 * Additional controllers for future modules (TaskController, SessionController)
 * can be added here as they are implemented, keeping the test always aligned
 * with the real application surface.
 */

// Placeholder controllers to simulate future modules being registered.
// They mirror the route structure that will be implemented per the design.
@Controller('tasks')
class MockTaskController {
  @Get()
  findAll() { return []; }

  @Post()
  create() { return {}; }

  @Patch(':taskId')
  update() { return {}; }

  @Delete(':taskId')
  remove() { return {}; }

  @Get(':taskId/micro-objectives')
  getMicroObjectives() { return []; }

  @Patch(':taskId/micro-objectives/:moId')
  updateMicroObjective() { return {}; }
}

@Controller('sessions')
class MockSessionController {
  @Post()
  startSession() { return {}; }

  @Post(':sessionId/fatigue')
  submitFatigue() { return {}; }

  @Get()
  getHistory() { return []; }
}

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: true }),
    JwtModule.register({
      secret: 'test-secret-for-route-versioning-test-32chars!',
      signOptions: { expiresIn: '24h' },
    }),
  ],
  controllers: [
    AuthController,
    MockTaskController,
    MockSessionController,
  ],
  providers: [
    AuthService,
    {
      provide: PrismaService,
      useValue: mockPrismaService,
    },
    {
      provide: ConfigService,
      useValue: { get: (_key: string) => 'test-secret-for-route-versioning-test-32chars!' },
    },
    // Register the global JWT guard exactly as AppModule does
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
class RouteVersioningTestModule {}

// ─── Test suite ───────────────────────────────────────────────────────────────

describe('API Gateway — Property 23: Versionado de Rutas bajo /api/v1/', () => {
  /**
   * **Validates: Requisito 9.3**
   *
   * Every route registered in the NestJS router MUST begin with /api/v1/.
   */

  let app: INestApplication;
  let registeredRoutes: RegisteredRoute[];

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [RouteVersioningTestModule],
    }).compile();

    app = moduleRef.createNestApplication();

    // Apply the SAME global prefix as main.ts — Requisito 9.3
    app.setGlobalPrefix('api/v1');

    // Apply same global infrastructure as main.ts
    app.useGlobalFilters(new GlobalExceptionFilter());
    app.useGlobalInterceptors(new ResponseInterceptor());

    await app.init();

    // Collect actual routes after initialisation
    registeredRoutes = extractRoutes(app);
  });

  afterAll(async () => {
    await app.close();
  });

  // ── Smoke test: routes were actually collected ──────────────────────────────

  it('P23 — at least one route is registered in the application', () => {
    expect(registeredRoutes.length).toBeGreaterThan(0);
  });

  it('P23 — registered routes include expected auth endpoints', () => {
    const paths = registeredRoutes.map((r) => r.path);
    expect(paths).toContain('/api/v1/auth/register');
    expect(paths).toContain('/api/v1/auth/login');
  });

  // ── Core property: every registered route starts with /api/v1/ ─────────────

  it('P23 — property: FOR ALL registered routes, path starts with /api/v1/', () => {
    /**
     * **Validates: Requisito 9.3**
     *
     * We use fc.constantFrom to generate one route at a time from the
     * actual set of registered routes and assert the prefix invariant.
     * This is a property test: it runs over every element in the route set.
     */
    expect(registeredRoutes.length).toBeGreaterThan(0);

    fc.assert(
      fc.property(
        fc.constantFrom(...registeredRoutes),
        (route) => {
          // The invariant: every registered route path MUST start with /api/v1/
          return route.path.startsWith('/api/v1/');
        },
      ),
      {
        numRuns: registeredRoutes.length,
        verbose: true,
      },
    );
  });

  // ── Complementary property: no route is accessible without the prefix ───────

  it('P23 — property: FOR ALL registered routes, path does NOT start with /auth/ directly (prefix mandatory)', () => {
    /**
     * **Validates: Requisito 9.3**
     *
     * Negative check: none of the registered routes should be accessible
     * at an un-versioned path like /auth/register.
     * The path must always include the /api/v1 segment.
     */
    fc.assert(
      fc.property(
        fc.constantFrom(...registeredRoutes),
        (route) => {
          // Route should NOT start with /auth, /tasks, /sessions without /api/v1
          const knownResources = ['/auth/', '/tasks', '/tasks/', '/sessions', '/sessions/'];
          const startsWithUnversioned = knownResources.some((resource) =>
            route.path.startsWith(resource),
          );
          return !startsWithUnversioned;
        },
      ),
      { numRuns: registeredRoutes.length },
    );
  });

  // ── Exhaustive check: log all routes for auditability ───────────────────────

  it('P23 — all routes are enumerated and each starts with /api/v1/', () => {
    /**
     * **Validates: Requisito 9.3**
     *
     * Deterministic exhaustive check that mirrors the property above
     * but fails with a descriptive message listing ANY violating route.
     * Complements the PBT assertion above.
     */
    const violations = registeredRoutes.filter(
      (route) => !route.path.startsWith('/api/v1/'),
    );

    if (violations.length > 0) {
      const violationList = violations
        .map((r) => `  ${r.method} ${r.path}`)
        .join('\n');
      throw new Error(
        `The following routes are NOT versioned under /api/v1/:\n${violationList}`,
      );
    }

    expect(violations).toHaveLength(0);
  });
});
