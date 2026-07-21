-- AlterTable
ALTER TABLE "notification_logs" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "students" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "tasks" ALTER COLUMN "updated_at" DROP DEFAULT;

-- CreateIndex
CREATE INDEX "micro_objectives_is_completed_idx" ON "micro_objectives"("is_completed");

-- CreateIndex
CREATE INDEX "notification_logs_status_idx" ON "notification_logs"("status");

-- CreateIndex
CREATE INDEX "sessions_is_active_idx" ON "sessions"("is_active");

-- CreateIndex
CREATE INDEX "tasks_is_deleted_idx" ON "tasks"("is_deleted");

-- CreateIndex
CREATE INDEX "tasks_deadline_idx" ON "tasks"("deadline");
