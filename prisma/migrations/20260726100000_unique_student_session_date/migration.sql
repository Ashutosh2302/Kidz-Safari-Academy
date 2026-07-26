-- CreateIndex
CREATE UNIQUE INDEX "sessions_studentId_sessionDate_key" ON "sessions"("studentId", "sessionDate");
