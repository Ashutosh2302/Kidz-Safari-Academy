-- AlterTable
ALTER TABLE "media_assets" ADD COLUMN     "isHighlight" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "session_photos" ADD COLUMN     "isHighlight" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "session_photos_isHighlight_idx" ON "session_photos"("isHighlight");
