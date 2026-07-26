/**
 * Wipes all student-linked data AND the leap-type library.
 * Usage: npx tsx scripts/clear-student-data.ts
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

async function main() {
  const before = {
    students: await prisma.student.count(),
    sessions: await prisma.session.count(),
    photos: await prisma.sessionPhoto.count(),
    media: await prisma.mediaAsset.count(),
    attendance: await prisma.attendance.count(),
    unlocks: await prisma.studentMilestone.count(),
    feeCycles: await prisma.feeCycle.count(),
    payments: await prisma.payment.count(),
    leaps: await prisma.milestone.count(),
  };

  console.log("\nBefore wipe:", before);

  await prisma.studentMilestone.deleteMany();
  await prisma.milestone.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.feeCycle.deleteMany();
  await prisma.attendance.deleteMany();
  await prisma.sessionPhoto.deleteMany();
  await prisma.session.deleteMany();
  await prisma.mediaAsset.deleteMany();
  await prisma.student.deleteMany();

  const after = {
    students: await prisma.student.count(),
    sessions: await prisma.session.count(),
    photos: await prisma.sessionPhoto.count(),
    media: await prisma.mediaAsset.count(),
    attendance: await prisma.attendance.count(),
    unlocks: await prisma.studentMilestone.count(),
    feeCycles: await prisma.feeCycle.count(),
    payments: await prisma.payment.count(),
    leaps: await prisma.milestone.count(),
  };

  console.log("After wipe:", after);
  console.log(
    "\nReady for real data. Students, sessions, fees, and leap types cleared.\n",
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
