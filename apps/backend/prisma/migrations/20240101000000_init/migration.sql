-- MindFlow — Initial schema migration
-- Requisitos: 7.1, 7.2, 7.3, 7.4, 7.5
--
-- Applies the full PostgreSQL schema including:
--   • UUID generation via pgcrypto
--   • All 6 domain tables in FK-dependency order
--   • CHECK constraints on fatigue_score, estimated_minutes, and status
--   • Indexes on all FK columns for query performance

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── students ─────────────────────────────────────────────────────────────────
CREATE TABLE "students" (
  "id"            UUID                     NOT NULL DEFAULT gen_random_uuid(),
  "email"         VARCHAR(255)             NOT NULL,
  "password_hash" VARCHAR(255)             NOT NULL,
  "created_at"    TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  "updated_at"    TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

  CONSTRAINT "students_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "students_email_key" UNIQUE ("email")
);

-- ─── sessions ─────────────────────────────────────────────────────────────────
CREATE TABLE "sessions" (
  "id"         UUID                     NOT NULL DEFAULT gen_random_uuid(),
  "student_id" UUID                     NOT NULL,
  "started_at" TIMESTAMP WITH TIME ZONE NOT NULL,
  "ended_at"   TIMESTAMP WITH TIME ZONE,
  "is_active"  BOOLEAN                  NOT NULL DEFAULT TRUE,

  CONSTRAINT "sessions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "sessions_student_id_fkey"
    FOREIGN KEY ("student_id") REFERENCES "students" ("id")
    ON UPDATE CASCADE ON DELETE RESTRICT
);

CREATE INDEX "sessions_student_id_idx" ON "sessions" ("student_id");

-- ─── fatigue_records ──────────────────────────────────────────────────────────
CREATE TABLE "fatigue_records" (
  "id"              UUID                     NOT NULL DEFAULT gen_random_uuid(),
  "session_id"      UUID                     NOT NULL,
  "student_id"      UUID                     NOT NULL,
  "fatigue_score"   SMALLINT                 NOT NULL,
  "recorded_at_utc" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

  CONSTRAINT "fatigue_records_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "fatigue_records_session_id_fkey"
    FOREIGN KEY ("session_id") REFERENCES "sessions" ("id")
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT "fatigue_records_student_id_fkey"
    FOREIGN KEY ("student_id") REFERENCES "students" ("id")
    ON UPDATE CASCADE ON DELETE RESTRICT,
  -- Requisito 7.3: fatigue_score must be in [1, 5]
  CONSTRAINT "fatigue_records_fatigue_score_check"
    CHECK ("fatigue_score" >= 1 AND "fatigue_score" <= 5)
);

CREATE INDEX "fatigue_records_session_id_idx" ON "fatigue_records" ("session_id");
CREATE INDEX "fatigue_records_student_id_idx" ON "fatigue_records" ("student_id");

-- ─── tasks ────────────────────────────────────────────────────────────────────
CREATE TABLE "tasks" (
  "id"          UUID                     NOT NULL DEFAULT gen_random_uuid(),
  "student_id"  UUID                     NOT NULL,
  "name"        VARCHAR(255)             NOT NULL,
  "description" TEXT,
  "deadline"    TIMESTAMP WITH TIME ZONE NOT NULL,
  "is_deleted"  BOOLEAN                  NOT NULL DEFAULT FALSE,
  "created_at"  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  "updated_at"  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

  CONSTRAINT "tasks_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "tasks_student_id_fkey"
    FOREIGN KEY ("student_id") REFERENCES "students" ("id")
    ON UPDATE CASCADE ON DELETE RESTRICT
);

CREATE INDEX "tasks_student_id_idx" ON "tasks" ("student_id");

-- ─── micro_objectives ─────────────────────────────────────────────────────────
CREATE TABLE "micro_objectives" (
  "id"                UUID                     NOT NULL DEFAULT gen_random_uuid(),
  "task_id"           UUID                     NOT NULL,
  "session_id"        UUID                     NOT NULL,
  "content"           TEXT                     NOT NULL,
  "estimated_minutes" SMALLINT                 NOT NULL,
  "is_completed"      BOOLEAN                  NOT NULL DEFAULT FALSE,
  "is_audit_only"     BOOLEAN                  NOT NULL DEFAULT FALSE,
  "created_at"        TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

  CONSTRAINT "micro_objectives_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "micro_objectives_task_id_fkey"
    FOREIGN KEY ("task_id") REFERENCES "tasks" ("id")
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT "micro_objectives_session_id_fkey"
    FOREIGN KEY ("session_id") REFERENCES "sessions" ("id")
    ON UPDATE CASCADE ON DELETE RESTRICT,
  -- Requisito 7.4: estimated_minutes must be in (0, 25]
  CONSTRAINT "micro_objectives_estimated_minutes_check"
    CHECK ("estimated_minutes" > 0 AND "estimated_minutes" <= 25)
);

CREATE INDEX "micro_objectives_task_id_idx"    ON "micro_objectives" ("task_id");
CREATE INDEX "micro_objectives_session_id_idx" ON "micro_objectives" ("session_id");

-- ─── notification_logs ────────────────────────────────────────────────────────
CREATE TABLE "notification_logs" (
  "id"               UUID                     NOT NULL DEFAULT gen_random_uuid(),
  "student_id"       UUID                     NOT NULL,
  "task_id"          UUID                     NOT NULL,
  "status"           VARCHAR(20)              NOT NULL,
  "attempt_count"    SMALLINT                 NOT NULL DEFAULT 0,
  "dispatched_at_utc" TIMESTAMP WITH TIME ZONE NOT NULL,
  "updated_at"       TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

  CONSTRAINT "notification_logs_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "notification_logs_student_id_fkey"
    FOREIGN KEY ("student_id") REFERENCES "students" ("id")
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT "notification_logs_task_id_fkey"
    FOREIGN KEY ("task_id") REFERENCES "tasks" ("id")
    ON UPDATE CASCADE ON DELETE RESTRICT,
  -- Requisito 7.5: status must be one of the allowed values
  CONSTRAINT "notification_logs_status_check"
    CHECK ("status" IN ('pending', 'sent', 'failed'))
);

CREATE INDEX "notification_logs_student_id_idx" ON "notification_logs" ("student_id");
CREATE INDEX "notification_logs_task_id_idx"    ON "notification_logs" ("task_id");
