/**
 * Optional seed — nothing runs by default.
 *   SEED_LEAP_LIBRARY=1  → upsert leap-type templates
 *   SEED_DEMO_STUDENTS=1 → add demo students (dev only)
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";
import { allocateUniqueMagicToken } from "../lib/allocate-magic-token";
import { parentPortalUrl } from "../lib/magic-link";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});
const prisma = new PrismaClient({ adapter });

const leapTypes = [
  { name: "Welcome song", category: "Rhymes", icon: "🎵" },
  { name: "Finger plays", category: "Rhymes", icon: "✋" },
  { name: "Story circle listening", category: "Stories", icon: "📖" },
  { name: "Retells a short tale", category: "Stories", icon: "🗣️" },
  { name: "Balanced walk", category: "Motor Skills", icon: "🚶" },
  { name: "Builds with blocks", category: "Motor Skills", icon: "🧱" },
  { name: "Shares during play", category: "Social Play", icon: "🤝" },
  { name: "Takes turns", category: "Social Play", icon: "🔄" },
  { name: "Nature walk notice", category: "Nature Circle", icon: "🍃" },
  { name: "Tends a plant", category: "Nature Circle", icon: "🌱" },
];

const demoStudents = [
  { name: "Aarav Sharma", parentName: "Neha Sharma", parentPhone: "9876500001", dob: "2021-03-14", monthlyFee: 2500 },
  { name: "Ananya Patel", parentName: "Rina Patel", parentPhone: "9876500002", dob: "2020-11-02", monthlyFee: 2500 },
];

async function seedLeapLibrary() {
  let created = 0;
  let existing = 0;
  for (const leap of leapTypes) {
    const found = await prisma.milestone.findFirst({
      where: {
        name: { equals: leap.name, mode: "insensitive" },
        category: { equals: leap.category, mode: "insensitive" },
      },
    });
    if (found) {
      existing += 1;
      continue;
    }
    await prisma.milestone.create({ data: leap });
    created += 1;
  }
  console.log(
    `Leap library: ${created} added, ${existing} already present (${leapTypes.length} templates).`,
  );
}

async function seedDemoStudents() {
  console.log("\nSEED_DEMO_STUDENTS=1 — adding demo students (dev only):\n");
  const created = [];
  for (const s of demoStudents) {
    const student = await prisma.student.create({
      data: {
        name: s.name,
        parentName: s.parentName,
        parentPhone: s.parentPhone,
        dob: new Date(s.dob),
        enrolledOn: new Date(),
        monthlyFee: s.monthlyFee,
        magicLinkToken: await allocateUniqueMagicToken(),
      },
    });
    created.push(student);
  }
  const peers = created.map((s) => ({ id: s.id, name: s.name }));
  for (const student of created) {
    console.log(`${student.name} · ${parentPortalUrl(student, peers)}`);
  }
  console.log("");
}

async function main() {
  const seedLeaps = process.env.SEED_LEAP_LIBRARY === "1";
  const seedDemo = process.env.SEED_DEMO_STUDENTS === "1";

  if (!seedLeaps && !seedDemo) {
    console.log(
      "\nNothing to seed (default is empty).\n" +
        "  SEED_LEAP_LIBRARY=1  — add leap-type templates\n" +
        "  SEED_DEMO_STUDENTS=1 — add demo students\n",
    );
    return;
  }

  if (seedLeaps) {
    console.log("\nSeeding leap library…\n");
    await seedLeapLibrary();
  } else {
    console.log("\nSkipping leap library (set SEED_LEAP_LIBRARY=1 to add).\n");
  }

  if (seedDemo) {
    await seedDemoStudents();
  }

  console.log("Done.\n");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
