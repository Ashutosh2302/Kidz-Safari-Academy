/**
 * One-time cleanup: merge sessions that share the same student + calendar day.
 * Combines notes/photos into the oldest session, then deletes duplicates.
 *
 * Usage: npx tsx scripts/merge-duplicate-sessions.ts
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";
import {
  mergeSessionNotes,
  sessionDateKey,
} from "../lib/session-day";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

async function main() {
  const sessions = await prisma.session.findMany({
    include: { photos: true },
    orderBy: [{ studentId: "asc" }, { sessionDate: "asc" }, { createdAt: "asc" }],
  });

  const groups = new Map<string, typeof sessions>();
  for (const session of sessions) {
    const key = `${session.studentId}|${sessionDateKey(session.sessionDate)}`;
    const list = groups.get(key) ?? [];
    list.push(session);
    groups.set(key, list);
  }

  let mergedGroups = 0;
  let deletedSessions = 0;
  let movedPhotos = 0;

  for (const [, group] of groups) {
    if (group.length < 2) continue;

    const [keeper, ...dupes] = group;
    mergedGroups += 1;

    let notes = keeper.notes;
    let activityCategory = keeper.activityCategory;

    for (const dupe of dupes) {
      notes = mergeSessionNotes(notes, dupe.notes);
      // Prefer a non-default category from a later row if keeper is default
      if (
        activityCategory === "Circle Time" &&
        dupe.activityCategory !== "Circle Time"
      ) {
        activityCategory = dupe.activityCategory;
      }
    }

    await prisma.$transaction(async (tx) => {
      await tx.session.update({
        where: { id: keeper.id },
        data: {
          notes,
          activityCategory,
          // Normalize to UTC midnight for the calendar day
          sessionDate: new Date(`${sessionDateKey(keeper.sessionDate)}T00:00:00.000Z`),
        },
      });

      for (const dupe of dupes) {
        for (const photo of dupe.photos) {
          if (photo.mediaId) {
            const already = await tx.sessionPhoto.findFirst({
              where: {
                sessionId: keeper.id,
                mediaId: photo.mediaId,
              },
            });
            if (already) {
              await tx.sessionPhoto.delete({ where: { id: photo.id } });
              continue;
            }
          }

          await tx.sessionPhoto.update({
            where: { id: photo.id },
            data: { sessionId: keeper.id },
          });
          movedPhotos += 1;
        }

        await tx.session.delete({ where: { id: dupe.id } });
        deletedSessions += 1;
      }
    });

    console.log(
      `Merged ${group.length} → 1 for student ${keeper.studentId} on ${sessionDateKey(keeper.sessionDate)}`,
    );
  }

  console.log("\nDone.");
  console.log({
    duplicateDayGroups: mergedGroups,
    sessionsDeleted: deletedSessions,
    photosMoved: movedPhotos,
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
