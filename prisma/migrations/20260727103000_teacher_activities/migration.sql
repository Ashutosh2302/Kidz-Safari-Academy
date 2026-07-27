-- CreateTable
CREATE TABLE "activities" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "activities_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "activities_name_key" ON "activities"("name");

-- CreateIndex
CREATE INDEX "activities_name_idx" ON "activities"("name");

-- AlterTable: activity becomes optional (no auto-seed of old hardcoded labels)
ALTER TABLE "sessions" ALTER COLUMN "activityCategory" DROP DEFAULT;
ALTER TABLE "sessions" ALTER COLUMN "activityCategory" DROP NOT NULL;
