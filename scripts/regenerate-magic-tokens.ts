/**
 * One-time: replace long legacy tokens with 8-char alphanumeric tokens.
 * Usage: npx tsx scripts/regenerate-magic-tokens.ts
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";
import { allocateUniqueMagicToken } from "../lib/allocate-magic-token";
import { MAGIC_TOKEN_LENGTH, parentPortalUrl } from "../lib/magic-link";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

async function main() {
  const students = await prisma.student.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, magicLinkToken: true },
  });

  const peers = students.map((s) => ({ id: s.id, name: s.name }));
  let updated = 0;

  for (const student of students) {
    const alreadyShort =
      student.magicLinkToken.length === MAGIC_TOKEN_LENGTH &&
      /^[A-Za-z0-9]+$/.test(student.magicLinkToken);
    if (alreadyShort) {
      console.log(
        `keep  ${student.name} · ${parentPortalUrl({ ...student, magicLinkToken: student.magicLinkToken }, peers)}`,
      );
      continue;
    }

    const token = await allocateUniqueMagicToken();
    await prisma.student.update({
      where: { id: student.id },
      data: { magicLinkToken: token },
    });
    updated += 1;
    console.log(
      `new   ${student.name} · ${parentPortalUrl({ ...student, magicLinkToken: token }, peers)}`,
    );
  }

  console.log(`\nDone. Regenerated ${updated} / ${students.length} tokens.\n`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
