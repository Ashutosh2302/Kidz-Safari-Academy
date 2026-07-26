/**
 * Dev helper — creates one demo session for the first student.
 * Requires an existing student (add via /admin/students or npm run db:seed:demo).
 * Not run automatically.
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";
import { toDateInputValue } from "../lib/dates";
import { parentPortalUrl } from "../lib/magic-link";
import { findOrUpsertSessionForDay, parseSessionDateInput } from "../lib/session-day";

async function main() {
  if (process.env.SEED_DEMO_STUDENTS !== "1" && process.env.ALLOW_DEMO_SESSION !== "1") {
    console.error(
      "Refusing to create demo session.\n" +
        "Set ALLOW_DEMO_SESSION=1 (or SEED_DEMO_STUDENTS=1) to run this intentionally.",
    );
    process.exit(1);
  }

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
  });

  const student = await prisma.student.findFirst({ orderBy: { name: "asc" } });
  if (!student) {
    throw new Error("No students — add one in /admin/students first");
  }

  const first = student.name.split(" ")[0] ?? student.name;
  await findOrUpsertSessionForDay(prisma, {
    studentId: student.id,
    sessionDate: parseSessionDateInput(toDateInputValue()),
    notes: `Today we sang the welcome song, mixed watercolours, and built a rainbow tower together. ${first} shared crayons so kindly!`,
    activityCategory: "Art",
    createdBy: "teacher",
    preferIncomingNotes: true,
  });

  console.log(`Demo session for ${student.name}`);
  console.log(`Parent URL: ${parentPortalUrl(student)}`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
