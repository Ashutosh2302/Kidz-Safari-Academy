-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'UPI', 'BANK', 'OTHER');

-- CreateTable
CREATE TABLE "fee_cycles" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "amountDue" INTEGER NOT NULL,
    "amountPaid" INTEGER NOT NULL DEFAULT 0,
    "status" "FeeStatus" NOT NULL DEFAULT 'DUE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fee_cycles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "feeCycleId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "method" "PaymentMethod" NOT NULL DEFAULT 'CASH',
    "note" TEXT,
    "paidAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- Migrate legacy calendar-month fee_payments → join-style cycles + ledger rows
INSERT INTO "fee_cycles" (
    "id", "studentId", "periodStart", "periodEnd",
    "amountDue", "amountPaid", "status", "createdAt", "updatedAt"
)
SELECT
    fp."id",
    fp."studentId",
    fp."periodStart",
    (fp."periodStart" + INTERVAL '1 month' - INTERVAL '1 day'),
    fp."amountDue",
    fp."amountPaid",
    fp."status",
    fp."createdAt",
    fp."updatedAt"
FROM "fee_payments" fp;

INSERT INTO "payments" (
    "id", "feeCycleId", "studentId", "amount", "method", "note", "paidAt", "createdAt"
)
SELECT
    'mig_' || fp."id",
    fp."id",
    fp."studentId",
    fp."amountPaid",
    'CASH',
    fp."notes",
    COALESCE(fp."paidAt", fp."createdAt"),
    fp."createdAt"
FROM "fee_payments" fp
WHERE fp."amountPaid" > 0;

-- DropTable
DROP TABLE "fee_payments";

-- CreateIndex
CREATE UNIQUE INDEX "fee_cycles_studentId_periodStart_key" ON "fee_cycles"("studentId", "periodStart");
CREATE INDEX "fee_cycles_status_idx" ON "fee_cycles"("status");
CREATE INDEX "fee_cycles_periodStart_idx" ON "fee_cycles"("periodStart");
CREATE INDEX "fee_cycles_periodEnd_idx" ON "fee_cycles"("periodEnd");
CREATE INDEX "payments_feeCycleId_idx" ON "payments"("feeCycleId");
CREATE INDEX "payments_studentId_idx" ON "payments"("studentId");
CREATE INDEX "payments_paidAt_idx" ON "payments"("paidAt");

-- AddForeignKey
ALTER TABLE "fee_cycles" ADD CONSTRAINT "fee_cycles_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "payments" ADD CONSTRAINT "payments_feeCycleId_fkey" FOREIGN KEY ("feeCycleId") REFERENCES "fee_cycles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "payments" ADD CONSTRAINT "payments_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;
