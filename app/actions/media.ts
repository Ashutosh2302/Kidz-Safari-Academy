"use server";

import { revalidatePath } from "next/cache";
import { isTeacherAuthed } from "@/lib/auth";
import {
  ACTIVITY_CATEGORIES,
  isActivityCategory,
  type ActivityCategory,
} from "@/lib/copy";
import { firstName } from "@/lib/dates";
import { prisma } from "@/lib/prisma";
import { revalidateParentPortal } from "@/lib/revalidate-parent";
import {
  findOrUpsertSessionForDay,
  parseSessionDateInput,
} from "@/lib/session-day";

function resolveCaption(template: string, studentName: string) {
  const first = firstName(studentName);
  return template
    .replaceAll("{student name}", studentName)
    .replaceAll("{studentName}", studentName)
    .replaceAll("{name}", first)
    .replaceAll("{firstName}", first)
    .trim();
}

export async function assignMediaToStudents(input: {
  mediaIds: string[];
  studentIds: string[];
  sessionDate: string;
  captionTemplate: string;
  /** Optional shared note written onto each child's session for that day */
  sessionNote?: string;
  activityCategory?: string;
}) {
  if (!(await isTeacherAuthed())) {
    return { error: "Please sign in first." };
  }

  if (input.mediaIds.length === 0) {
    return { error: "Pick at least one photo or video." };
  }
  if (input.studentIds.length === 0) {
    return { error: "Pick at least one child." };
  }

  const sessionDate = parseSessionDateInput(input.sessionDate);
  if (Number.isNaN(sessionDate.getTime())) {
    return { error: "That date doesn’t look right." };
  }

  const [media, students] = await Promise.all([
    prisma.mediaAsset.findMany({
      where: { id: { in: input.mediaIds } },
    }),
    prisma.student.findMany({
      where: { id: { in: input.studentIds }, archivedAt: null },
    }),
  ]);

  if (media.length === 0) {
    return { error: "Those media items weren’t found." };
  }
  if (students.length === 0) {
    return { error: "Those children weren’t found." };
  }

  const trimmedNote = input.sessionNote?.trim() ?? "";
  const rawCategory = input.activityCategory ?? "";
  const activityCategory: ActivityCategory = isActivityCategory(rawCategory)
    ? rawCategory
    : ACTIVITY_CATEGORIES[0];

  const tokensToRevalidate = new Set<string>();

  await prisma.$transaction(async (tx) => {
    for (const student of students) {
      tokensToRevalidate.add(student.magicLinkToken);

      const session = await findOrUpsertSessionForDay(tx, {
        studentId: student.id,
        sessionDate,
        // Only pass a note when the teacher wrote one — don't overwrite
        // a real Notes-form entry with the placeholder.
        notes: trimmedNote || undefined,
        activityCategory,
        createdBy: "teacher",
        preferIncomingNotes: false,
      });

      const caption = resolveCaption(
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

    await tx.mediaAsset.updateMany({
      where: { id: { in: media.map((m) => m.id) } },
      data: { assignedAt: new Date() },
    });
  });

  revalidatePath("/admin/media");
  revalidatePath("/admin");
  for (const token of tokensToRevalidate) {
    revalidateParentPortal(token);
  }

  return {
    success: true,
    assignedTo: students.length,
    mediaCount: media.length,
  };
}

export async function deleteMediaAsset(mediaId: string) {
  if (!(await isTeacherAuthed())) {
    return { error: "Please sign in first." };
  }

  await prisma.mediaAsset.delete({ where: { id: mediaId } });
  revalidatePath("/admin/media");
  return { success: true };
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
