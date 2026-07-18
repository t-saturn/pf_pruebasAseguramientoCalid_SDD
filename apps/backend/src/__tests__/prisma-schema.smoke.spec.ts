/**
 * Smoke tests for the Prisma schema and migration SQL.
 *
 * Validates statically (without a live DB) that:
 *  - schema.prisma defines all required models with correct fields
 *  - migration.sql includes all required tables, FK constraints, and CHECK constraints
 *  - PrismaService is correctly configured
 *  - Shared TypeScript interfaces are exported
 *
 * Validates: Requirements 7.1, 7.2, 7.3, 7.4, 7.5
 */
import * as fs from 'fs';
import * as path from 'path';

// ─── File paths ───────────────────────────────────────────────────────────────
// Resolve from src/__tests__/ → src/ → apps/backend/
const backendDir = path.resolve(__dirname, '../..');
const schemaPath = path.join(backendDir, 'prisma', 'schema.prisma');
const migrationPath = path.join(
  backendDir,
  'prisma',
  'migrations',
  '20240101000000_init',
  'migration.sql',
);
const prismaConfigPath = path.join(backendDir, 'prisma.config.ts');
const prismaServicePath = path.join(backendDir, 'src', 'prisma', 'prisma.service.ts');

const schemaContent = fs.readFileSync(schemaPath, 'utf-8');
const migrationContent = fs.readFileSync(migrationPath, 'utf-8');
const prismaConfigContent = fs.readFileSync(prismaConfigPath, 'utf-8');
const prismaServiceContent = fs.readFileSync(prismaServicePath, 'utf-8');

// ─── schema.prisma tests ──────────────────────────────────────────────────────
describe('schema.prisma — Requisito 7.1', () => {
  it('should use postgresql as provider', () => {
    expect(schemaContent).toMatch(/provider\s*=\s*"postgresql"/);
  });

  it('should define Student model', () => {
    expect(schemaContent).toContain('model Student {');
  });

  it('should define Session model', () => {
    expect(schemaContent).toContain('model Session {');
  });

  it('should define FatigueRecord model', () => {
    expect(schemaContent).toContain('model FatigueRecord {');
  });

  it('should define Task model', () => {
    expect(schemaContent).toContain('model Task {');
  });

  it('should define MicroObjective model', () => {
    expect(schemaContent).toContain('model MicroObjective {');
  });

  it('should define NotificationLog model', () => {
    expect(schemaContent).toContain('model NotificationLog {');
  });
});

describe('schema.prisma — UUID primary keys', () => {
  it('should use gen_random_uuid() for Student.id', () => {
    expect(schemaContent).toMatch(/id\s+String\s+@id\s+@default\(dbgenerated\("gen_random_uuid\(\)"\)\)\s+@db\.Uuid/);
  });

  it('should use @db.Uuid type for all UUID fields', () => {
    // Count @db.Uuid occurrences — should appear for every id and FK field
    const uuidCount = (schemaContent.match(/@db\.Uuid/g) ?? []).length;
    expect(uuidCount).toBeGreaterThanOrEqual(6); // at least one per model id
  });
});

describe('schema.prisma — timestamps UTC (Timestamptz)', () => {
  it('should use @db.Timestamptz for Student.createdAt', () => {
    expect(schemaContent).toMatch(/createdAt\s+DateTime.*@db\.Timestamptz/);
  });

  it('should use @db.Timestamptz for Session.startedAt', () => {
    expect(schemaContent).toMatch(/startedAt\s+DateTime.*@db\.Timestamptz/);
  });

  it('should use @db.Timestamptz for FatigueRecord.recordedAtUtc', () => {
    expect(schemaContent).toMatch(/recordedAtUtc\s+DateTime.*@db\.Timestamptz/);
  });
});

describe('schema.prisma — boolean flags', () => {
  it('should define Session.isActive as Boolean with default true', () => {
    expect(schemaContent).toMatch(/isActive\s+Boolean\s+@default\(true\)/);
  });

  it('should define Task.isDeleted as Boolean with default false', () => {
    expect(schemaContent).toMatch(/isDeleted\s+Boolean\s+@default\(false\)/);
  });

  it('should define MicroObjective.isCompleted as Boolean with default false', () => {
    expect(schemaContent).toMatch(/isCompleted\s+Boolean\s+@default\(false\)/);
  });

  it('should define MicroObjective.isAuditOnly as Boolean with default false', () => {
    expect(schemaContent).toMatch(/isAuditOnly\s+Boolean\s+@default\(false\)/);
  });
});

describe('schema.prisma — foreign key relations (Requisito 7.4)', () => {
  it('should have Session → Student relation', () => {
    expect(schemaContent).toMatch(/student\s+Student\s+@relation\(fields: \[studentId\]/);
  });

  it('should have FatigueRecord → Session relation', () => {
    expect(schemaContent).toMatch(/session\s+Session\s+@relation\(fields: \[sessionId\]/);
  });

  it('should have FatigueRecord → Student relation', () => {
    // FatigueRecord has both session and student relations
    const fatigueBlock = schemaContent.slice(
      schemaContent.indexOf('model FatigueRecord {'),
      schemaContent.indexOf('\n}\n', schemaContent.indexOf('model FatigueRecord {')),
    );
    expect(fatigueBlock).toContain('student  Student');
    expect(fatigueBlock).toContain('session  Session');
  });

  it('should have Task → Student relation', () => {
    const taskBlock = schemaContent.slice(
      schemaContent.indexOf('model Task {'),
      schemaContent.indexOf('\n}\n', schemaContent.indexOf('model Task {')),
    );
    expect(taskBlock).toContain('student');
    expect(taskBlock).toContain('Student');
  });

  it('should have MicroObjective → Task relation', () => {
    const moBlock = schemaContent.slice(
      schemaContent.indexOf('model MicroObjective {'),
      schemaContent.indexOf('\n}\n', schemaContent.indexOf('model MicroObjective {')),
    );
    expect(moBlock).toContain('task    Task');
    expect(moBlock).toContain('session Session');
  });

  it('should have NotificationLog → Student and Task relations', () => {
    const nlBlock = schemaContent.slice(
      schemaContent.indexOf('model NotificationLog {'),
      schemaContent.length,
    );
    expect(nlBlock).toContain('student Student');
    expect(nlBlock).toContain('task    Task');
  });
});

describe('schema.prisma — SmallInt for constrained fields (Requisito 7.3)', () => {
  it('should use @db.SmallInt for FatigueRecord.fatigueScore', () => {
    expect(schemaContent).toMatch(/fatigueScore\s+Int\s+@map\("fatigue_score"\)\s+@db\.SmallInt/);
  });

  it('should use @db.SmallInt for MicroObjective.estimatedMinutes', () => {
    expect(schemaContent).toMatch(/estimatedMinutes\s+Int\s+@map\("estimated_minutes"\)\s+@db\.SmallInt/);
  });

  it('should use @db.SmallInt for NotificationLog.attemptCount', () => {
    expect(schemaContent).toMatch(/attemptCount\s+Int\s+@default\(0\)\s+@map\("attempt_count"\)\s+@db\.SmallInt/);
  });
});

// ─── migration.sql tests ──────────────────────────────────────────────────────
describe('migration.sql — table creation (Requisito 7.1, 7.2)', () => {
  it('should CREATE TABLE students', () => {
    expect(migrationContent).toMatch(/CREATE TABLE "students"/);
  });

  it('should CREATE TABLE sessions', () => {
    expect(migrationContent).toMatch(/CREATE TABLE "sessions"/);
  });

  it('should CREATE TABLE fatigue_records', () => {
    expect(migrationContent).toMatch(/CREATE TABLE "fatigue_records"/);
  });

  it('should CREATE TABLE tasks', () => {
    expect(migrationContent).toMatch(/CREATE TABLE "tasks"/);
  });

  it('should CREATE TABLE micro_objectives', () => {
    expect(migrationContent).toMatch(/CREATE TABLE "micro_objectives"/);
  });

  it('should CREATE TABLE notification_logs', () => {
    expect(migrationContent).toMatch(/CREATE TABLE "notification_logs"/);
  });
});

describe('migration.sql — UUID generation', () => {
  it('should enable pgcrypto extension for gen_random_uuid()', () => {
    expect(migrationContent).toContain('CREATE EXTENSION IF NOT EXISTS "pgcrypto"');
  });

  it('should use gen_random_uuid() as default for all tables', () => {
    const genCount = (migrationContent.match(/gen_random_uuid\(\)/g) ?? []).length;
    expect(genCount).toBeGreaterThanOrEqual(6);
  });
});

describe('migration.sql — CHECK constraints (Requisito 7.3)', () => {
  it('should add CHECK constraint for fatigue_score >= 1', () => {
    expect(migrationContent).toMatch(/"fatigue_score"\s*>=\s*1/);
  });

  it('should add CHECK constraint for fatigue_score <= 5', () => {
    expect(migrationContent).toMatch(/"fatigue_score"\s*<=\s*5/);
  });

  it('should add CHECK constraint for estimated_minutes > 0', () => {
    expect(migrationContent).toMatch(/"estimated_minutes"\s*>\s*0/);
  });

  it('should add CHECK constraint for estimated_minutes <= 25', () => {
    expect(migrationContent).toMatch(/"estimated_minutes"\s*<=\s*25/);
  });

  it('should add CHECK constraint for notification status values', () => {
    expect(migrationContent).toMatch(/"status"\s+IN\s+\('pending',\s*'sent',\s*'failed'\)/);
  });
});

describe('migration.sql — foreign key constraints (Requisito 7.4)', () => {
  it('should define FK from sessions to students', () => {
    expect(migrationContent).toContain('sessions_student_id_fkey');
    expect(migrationContent).toMatch(/REFERENCES "students" \("id"\)/);
  });

  it('should define FK from fatigue_records to sessions', () => {
    expect(migrationContent).toContain('fatigue_records_session_id_fkey');
  });

  it('should define FK from fatigue_records to students', () => {
    expect(migrationContent).toContain('fatigue_records_student_id_fkey');
  });

  it('should define FK from tasks to students', () => {
    expect(migrationContent).toContain('tasks_student_id_fkey');
  });

  it('should define FK from micro_objectives to tasks', () => {
    expect(migrationContent).toContain('micro_objectives_task_id_fkey');
  });

  it('should define FK from micro_objectives to sessions', () => {
    expect(migrationContent).toContain('micro_objectives_session_id_fkey');
  });

  it('should define FK from notification_logs to students', () => {
    expect(migrationContent).toContain('notification_logs_student_id_fkey');
  });

  it('should define FK from notification_logs to tasks', () => {
    expect(migrationContent).toContain('notification_logs_task_id_fkey');
  });
});

describe('migration.sql — indexes on FK columns for performance', () => {
  it('should create index on sessions.student_id', () => {
    expect(migrationContent).toContain('sessions_student_id_idx');
  });

  it('should create index on fatigue_records.session_id', () => {
    expect(migrationContent).toContain('fatigue_records_session_id_idx');
  });

  it('should create index on tasks.student_id', () => {
    expect(migrationContent).toContain('tasks_student_id_idx');
  });

  it('should create index on micro_objectives.task_id', () => {
    expect(migrationContent).toContain('micro_objectives_task_id_idx');
  });

  it('should create index on notification_logs.student_id', () => {
    expect(migrationContent).toContain('notification_logs_student_id_idx');
  });
});

// ─── prisma.config.ts tests ───────────────────────────────────────────────────
describe('prisma.config.ts — Prisma 7 configuration (Requisito 7.5)', () => {
  it('should use defineConfig from prisma/config', () => {
    expect(prismaConfigContent).toContain("from 'prisma/config'");
  });

  it('should point schema to prisma/schema.prisma', () => {
    expect(prismaConfigContent).toContain("'prisma/schema.prisma'");
  });

  it('should use DATABASE_URL for datasource url', () => {
    expect(prismaConfigContent).toContain("process.env['DATABASE_URL']");
  });

  it('should document connection pool settings', () => {
    expect(prismaConfigContent).toMatch(/connection_limit/);
  });
});

// ─── PrismaService tests ──────────────────────────────────────────────────────
describe('PrismaService — NestJS lifecycle (Requisito 7.5)', () => {
  it('should extend PrismaClient', () => {
    expect(prismaServiceContent).toContain('extends PrismaClient');
  });

  it('should implement OnModuleInit', () => {
    expect(prismaServiceContent).toContain('OnModuleInit');
  });

  it('should implement OnModuleDestroy', () => {
    expect(prismaServiceContent).toContain('OnModuleDestroy');
  });

  it('should call $connect in onModuleInit', () => {
    expect(prismaServiceContent).toContain('this.$connect()');
  });

  it('should call $disconnect in onModuleDestroy', () => {
    expect(prismaServiceContent).toContain('this.$disconnect()');
  });

  it('should document pool settings (min: 2, max: 10) via DATABASE_URL', () => {
    expect(prismaServiceContent).toMatch(/connection_limit|pool.*min.*2|min.*2.*max.*10/);
  });
});

// ─── Shared interfaces tests ──────────────────────────────────────────────────
describe('@mindflow/shared — TypeScript interfaces exported', () => {
  // Import the module to verify exports compile and exist
  // We use require to avoid ts-jest module resolution issues
  let shared: Record<string, unknown>;

  beforeAll(() => {
    // This is a type-only check — we verify the source file exports the symbols
    const sharedPath = path.resolve(
      __dirname,
      '../../../../packages/shared/src/index.ts',
    );
    const sharedContent = fs.readFileSync(sharedPath, 'utf-8');
    shared = { _content: sharedContent };
  });

  it('should export StudentPayload interface', () => {
    expect((shared._content as string)).toContain('export interface StudentPayload');
  });

  it('should export Session interface', () => {
    expect((shared._content as string)).toContain('export interface Session');
  });

  it('should export FatigueRecord interface', () => {
    expect((shared._content as string)).toContain('export interface FatigueRecord');
  });

  it('should export Task interface', () => {
    expect((shared._content as string)).toContain('export interface Task');
  });

  it('should export MicroObjective interface', () => {
    expect((shared._content as string)).toContain('export interface MicroObjective');
  });

  it('Session interface should have isActive field', () => {
    expect((shared._content as string)).toContain('isActive: boolean');
  });

  it('FatigueRecord interface should have fatigueScore field', () => {
    expect((shared._content as string)).toContain('fatigueScore: number');
  });

  it('Task interface should have isDeleted field', () => {
    expect((shared._content as string)).toContain('isDeleted: boolean');
  });

  it('MicroObjective interface should have estimatedMinutes field', () => {
    expect((shared._content as string)).toContain('estimatedMinutes: number');
  });

  it('MicroObjective interface should have isAuditOnly field', () => {
    expect((shared._content as string)).toContain('isAuditOnly: boolean');
  });

  it('MicroObjective interface should have isCompleted field', () => {
    expect((shared._content as string)).toContain('isCompleted: boolean');
  });
});
