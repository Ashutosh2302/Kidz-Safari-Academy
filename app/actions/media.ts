"use server";

import { revalidatePath } from "next/cache";
import { isTeacherAuthed } from "@/lib/auth";
import { firstName } from "@/lib/dates";
import { prisma } from "@/lib/prisma";
import { revalidateParentPortal } from "@/lib/revalidate-parent";
import {
  deleteOrphanSessionIfEmpty,
  findOrUpsertSessionForDay,
  findSessionForStudentDay,
  parseSessionDateInput,
  utcDayRange,
} from "@/lib/session-day";

/** Resolve {name} / {student name} placeholders for a specific child. */
function resolveStudentTemplate(template: string, studentName: string) {
  const first = firstName(studentName);
  return template
    .replaceAll("{student name}", studentName)
    .replaceAll("{studentName}", studentName)
    .replaceAll("{name}", first)
    .replaceAll("{firstName}", first)
    .trim();
}

/**
 * Publish a day session to one or more children.
 * Requires at least one media item OR a real session note.
 */
export async function publishSessionDay(input: {
  mediaIds: string[];
  studentIds: string[];
  sessionDate: string;
  captionTemplate?: string;
  sessionNote?: string;
  activityCategory?: string;
}) {
  if (!(await isTeacherAuthed())) {
    return { error: "Please sign in first." };
  }

  if (input.studentIds.length === 0) {
    return { error: "Pick at least one child." };
  }

  const trimmedNote = input.sessionNote?.trim() ?? "";
  const mediaIds = input.mediaIds ?? [];
  if (mediaIds.length === 0 && !trimmedNote) {
    return {
      error: "Add a session note, or pick at least one photo or video.",
    };
  }

  const sessionDate = parseSessionDateInput(input.sessionDate);
  if (Number.isNaN(sessionDate.getTime())) {
    return { error: "That date doesn’t look right." };
  }

  const [media, students] = await Promise.all([
    mediaIds.length > 0
      ? prisma.mediaAsset.findMany({ where: { id: { in: mediaIds } } })
      : Promise.resolve([]),
    prisma.student.findMany({
      where: { id: { in: input.studentIds }, archivedAt: null },
    }),
  ]);

  if (mediaIds.length > 0 && media.length === 0) {
    return { error: "Those media items weren’t found." };
  }
  if (students.length === 0) {
    return { error: "Those children weren’t found." };
  }

  // Only children marked PRESENT for this day can receive a session
  const presentMarks = await prisma.attendance.findMany({
    where: {
      date: sessionDate,
      status: "PRESENT",
      studentId: { in: students.map((s) => s.id) },
    },
    select: { studentId: true },
  });
  const presentIds = new Set(presentMarks.map((m) => m.studentId));
  const notPresent = students.filter((s) => !presentIds.has(s.id));
  if (notPresent.length > 0) {
    const names = notPresent.map((s) => s.name.split(/\s+/)[0]).join(", ");
    return {
      error: `Mark attendance first. Not present for this day: ${names}.`,
    };
  }

  const { dayStart, dayEnd } = utcDayRange(sessionDate);
  const existingForDay = await prisma.session.findMany({
    where: {
      studentId: { in: students.map((s) => s.id) },
      sessionDate: { gte: dayStart, lt: dayEnd },
    },
    select: {
      id: true,
      studentId: true,
      student: { select: { name: true } },
    },
  });

  if (existingForDay.length > 0) {
    const names = existingForDay.map((s) => s.student.name.split(/\s+/)[0]);
    const label =
      names.length === 1
        ? names[0]
        : names.length === 2
          ? `${names[0]} and ${names[1]}`
          : `${names.slice(0, -1).join(", ")}, and ${names.at(-1)}`;
    return {
      error: `${label} already ${
        names.length === 1 ? "has" : "have"
      } a session on this date. Edit it in Session history instead of creating a new one.`,
      conflict: true as const,
      existingSessions: existingForDay.map((s) => ({
        id: s.id,
        studentId: s.studentId,
        studentName: s.student.name,
      })),
    };
  }

  const activityCategory = (input.activityCategory ?? "").trim();

  // If an activity was chosen, it must exist in the teacher's list
  if (activityCategory) {
    const known = await prisma.activity.findFirst({
      where: { name: { equals: activityCategory, mode: "insensitive" } },
      select: { name: true },
    });
    if (!known) {
      return { error: "Pick an activity from the list, or create a new one." };
    }
  }

  const tokensToRevalidate = new Set<string>();

  try {
    await prisma.$transaction(async (tx) => {
      for (const student of students) {
        const already = await findSessionForStudentDay(
          tx,
          student.id,
          sessionDate,
        );
        if (already) {
          throw new Error("SESSION_CONFLICT");
        }

        tokensToRevalidate.add(student.magicLinkToken);

        const resolvedNote = trimmedNote
          ? resolveStudentTemplate(trimmedNote, student.name)
          : "";

        const session = await findOrUpsertSessionForDay(tx, {
          studentId: student.id,
          sessionDate,
          notes: resolvedNote || undefined,
          activityCategory: activityCategory || undefined,
          createdBy: "teacher",
          preferIncomingNotes: Boolean(resolvedNote),
        });

        if (media.length === 0) continue;

        const caption = resolveStudentTemplate(
          input.captionTemplate || "{name}",
          student.name,
        );

        for (const asset of media) {
          const existing = await tx.sessionPhoto.findFirst({
            where: { sessionId: session.id, mediaId: asset.id },
          });
          if (existing) continue;

          await tx.sessionPhoto.create({
            data: {
              sessionId: session.id,
              photoUrl: asset.url,
              caption: caption || null,
              mediaId: asset.id,
              isHighlight: asset.isHighlight,
            },
          });
        }
      }

      if (media.length > 0) {
        await tx.mediaAsset.updateMany({
          where: { id: { in: media.map((m) => m.id) } },
          data: { assignedAt: new Date() },
        });
      }
    });
  } catch (err) {
    if (err instanceof Error && err.message === "SESSION_CONFLICT") {
      return {
        error:
          "A session already exists for one of these children on this date. Edit it in Session history instead.",
        conflict: true as const,
        existingSessions: [],
      };
    }
    throw err;
  }

  revalidatePath("/admin/media");
  revalidatePath("/admin");
  for (const token of tokensToRevalidate) {
    revalidateParentPortal(token);
  }

  return {
    success: true,
    assignedTo: students.length,
    mediaCount: media.length,
    notesOnly: media.length === 0,
  };
}

/** @deprecated Prefer publishSessionDay — kept for any stray callers */
export async function assignMediaToStudents(input: {
  mediaIds: string[];
  studentIds: string[];
  sessionDate: string;
  captionTemplate: string;
  sessionNote?: string;
  activityCategory?: string;
}) {
  return publishSessionDay(input);
}

export async function deleteMediaAsset(mediaId: string) {
  if (!(await isTeacherAuthed())) {
    return { error: "Please sign in first." };
  }

  await prisma.mediaAsset.delete({ where: { id: mediaId } });
  revalidatePath("/admin/media");
  return { success: true };
}

/** Remove a media asset from one or more children's timelines. */
export async function untagMediaFromStudents(input: {
  mediaId: string;
  studentIds: string[];
}) {
  if (!(await isTeacherAuthed())) {
    return { error: "Please sign in first." };
  }

  if (!input.mediaId) {
    return { error: "Pick a photo or video." };
  }
  if (input.studentIds.length === 0) {
    return { error: "Pick at least one child to remove." };
  }

  const asset = await prisma.mediaAsset.findUnique({
    where: { id: input.mediaId },
    select: { id: true },
  });
  if (!asset) {
    return { error: "That media item wasn’t found." };
  }

  const photos = await prisma.sessionPhoto.findMany({
    where: {
      mediaId: input.mediaId,
      session: { studentId: { in: input.studentIds } },
    },
    select: {
      id: true,
      sessionId: true,
      session: {
        select: {
          student: { select: { magicLinkToken: true } },
        },
      },
    },
  });

  if (photos.length === 0) {
    return { error: "Those children aren’t tagged on this item." };
  }

  const tokensToRevalidate = new Set(
    photos.map((p) => p.session.student.magicLinkToken),
  );
  const sessionIds = [...new Set(photos.map((p) => p.sessionId))];

  await prisma.$transaction(async (tx) => {
    await tx.sessionPhoto.deleteMany({
      where: { id: { in: photos.map((p) => p.id) } },
    });

    for (const sessionId of sessionIds) {
      await deleteOrphanSessionIfEmpty(tx, sessionId);
    }

    const remaining = await tx.sessionPhoto.count({
      where: { mediaId: input.mediaId },
    });
    if (remaining === 0) {
      await tx.mediaAsset.update({
        where: { id: input.mediaId },
        data: { assignedAt: null },
      });
    }
  });

  revalidatePath("/admin/media");
  revalidatePath("/admin");
  for (const token of tokensToRevalidate) {
    revalidateParentPortal(token);
  }

  return {
    success: true,
    removedFrom: photos.length,
  };
}

/** Star a standout photo for Memory Lane Month/Lifetime sampling */
export async function toggleMediaHighlight(mediaId: string) {
  if (!(await isTeacherAuthed())) {
    return { error: "Please sign in first." };
  }

  const asset = await prisma.mediaAsset.findUnique({ where: { id: mediaId } });
  if (!asset) return { error: "Media not found." };

  const isHighlight = !asset.isHighlight;
  await prisma.$transaction([
    prisma.mediaAsset.update({
      where: { id: mediaId },
      data: { isHighlight },
    }),
    prisma.sessionPhoto.updateMany({
      where: { mediaId },
      data: { isHighlight },
    }),
  ]);

  revalidatePath("/admin/media");
  return { success: true, isHighlight };
}
