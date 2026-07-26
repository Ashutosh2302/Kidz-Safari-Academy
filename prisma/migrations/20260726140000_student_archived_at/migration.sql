-- AlterTable
ALTER TABLE "students" ADD COLUMN "archivedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "students_archivedAt_idx" ON "students"("archivedAt");
