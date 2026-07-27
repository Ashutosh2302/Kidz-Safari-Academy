"use server";

import { revalidatePath } from "next/cache";
import { isTeacherAuthed } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidateParentPortal } from "@/lib/revalidate-parent";
import {
  findOrUpsertSessionForDay,
  parseSessionDateInput,
} from "@/lib/session-day";

export type CreateSessionInput = {
  studentId: string;
  sessionDate: string;
  notes: string;
  photoUrls: string[];
  activityCategory?: string;
};

export async function createSession(input: CreateSessionInput) {
  if (!(await isTeacherAuthed())) {
    return { error: "Please sign in with the teacher PIN first." };
  }

  const notes = input.notes.trim();
  if (!input.studentId) {
    return { error: "Pick a little one first." };
  }

  const student = await prisma.student.findUnique({
    where: { id: input.studentId },
    select: { id: true, archivedAt: true, magicLinkToken: true },
  });
  if (!student || student.archivedAt) {
    return { error: "That student isn’t on the active roster." };
  }

  if (!notes) {
    return { error: "Add a short note about today’s class." };
  }
  const sessionDate = parseSessionDateInput(input.sessionDate);
  if (Number.isNaN(sessionDate.getTime())) {
    return { error: "That date doesn’t look right." };
  }

  const activityCategory = (input.activityCategory ?? "").trim() || undefined;

  const session = await prisma.$transaction(async (tx) => {
    const daySession = await findOrUpsertSessionForDay(tx, {
      studentId: input.studentId,
      sessionDate,
      notes,
      activityCategory,
      createdBy: "teacher",
      preferIncomingNotes: true,
    });

    if (input.photoUrls.length > 0) {
      await tx.sessionPhoto.createMany({
        data: input.photoUrls.map((photoUrl) => ({
          sessionId: daySession.id,
          photoUrl,
        })),
      });
    }

    return tx.session.findUniqueOrThrow({
      where: { id: daySession.id },
      include: { student: true },
    });
  });

  revalidatePath("/admin");
  revalidateParentPortal(session.student.magicLinkToken);

  return { success: true, sessionId: session.id };
}
