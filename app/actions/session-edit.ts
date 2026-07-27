"use server";

import { revalidatePath } from "next/cache";
import { isTeacherAuthed } from "@/lib/auth";
import { firstName } from "@/lib/dates";
import { prisma } from "@/lib/prisma";
import { revalidateParentPortal } from "@/lib/revalidate-parent";
import {
  deleteOrphanSessionIfEmpty,
  isPlaceholderSessionNote,
} from "@/lib/session-day";

function isVideoUrl(url: string) {
  return /\.(mp4|mov|webm)(\?|$)/i.test(url) || url.includes("video");
}

/** Sessions + media library for a student's history editor. */
export async function loadStudentSessionHistory(studentId: string) {
  if (!(await isTeacherAuthed())) {
    return { error: "Please sign in first." };
  }

  const student = await prisma.student.findUnique({
    where: { id: studentId },
    select: { id: true, name: true },
  });
  if (!student) {
    return { error: "That student wasn’t found." };
  }

  const [sessions, library] = await Promise.all([
    prisma.session.findMany({
      where: { studentId },
      orderBy: [{ sessionDate: "desc" }, { createdAt: "desc" }],
      take: 60,
      select: {
        id: true,
        sessionDate: true,
        notes: true,
        activityCategory: true,
        student: { select: { id: true, name: true } },
        photos: {
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            photoUrl: true,
            caption: true,
            mediaId: true,
            media: { select: { kind: true } },
          },
        },
      },
    }),
    prisma.mediaAsset.findMany({
      orderBy: { createdAt: "desc" },
      take: 48,
      select: {
        id: true,
        url: true,
        kind: true,
        originalName: true,
      },
    }),
  ]);

  return {
    success: true as const,
    student,
    sessions: sessions.map((s) => ({
      id: s.id,
      sessionDate: s.sessionDate.toISOString(),
      notes: s.notes,
      activityCategory: s.activityCategory,
      student: s.student,
      photos: s.photos.map((p) => ({
        id: p.id,
        photoUrl: p.photoUrl,
        caption: p.caption,
        mediaId: p.mediaId,
        isVideo: p.media?.kind === "video" || isVideoUrl(p.photoUrl),
      })),
    })),
    library,
  };
}

function resolveStudentTemplate(template: string, studentName: string) {
  const first = firstName(studentName);
  return template
    .replaceAll("{student name}", studentName)
    .replaceAll("{studentName}", studentName)
    .replaceAll("{name}", first)
    .replaceAll("{firstName}", first)
    .trim();
}

async function loadSessionForEdit(sessionId: string) {
  return prisma.session.findUnique({
    where: { id: sessionId },
    select: {
      id: true,
      notes: true,
      activityCategory: true,
      student: {
        select: { id: true, name: true, magicLinkToken: true },
      },
    },
  });
}

function revalidateSessionPaths(token: string, studentId?: string) {
  revalidatePath("/admin/media");
  revalidatePath("/admin");
  revalidatePath("/admin/students");
  if (studentId) {
    revalidatePath(`/admin/students/${studentId}`);
    revalidatePath(`/admin/students/${studentId}/sessions`);
  }
  revalidateParentPortal(token);
}

/** Update note and/or activity on an existing session. */
export async function updateSessionDetails(input: {
  sessionId: string;
  notes: string;
  activityCategory?: string;
}) {
  if (!(await isTeacherAuthed())) {
    return { error: "Please sign in first." };
  }

  const notes = input.notes.trim();
  if (!notes) {
    return { error: "Session note can’t be empty." };
  }

  const session = await loadSessionForEdit(input.sessionId);
  if (!session) {
    return { error: "That session wasn’t found." };
  }

  const activityCategory = (input.activityCategory ?? "").trim() || null;
  if (activityCategory) {
    const known = await prisma.activity.findFirst({
      where: { name: { equals: activityCategory, mode: "insensitive" } },
      select: { id: true },
    });
    if (!known) {
      return { error: "Pick an activity from the list, or create a new one." };
    }
  }

  const resolvedNotes = resolveStudentTemplate(notes, session.student.name);

  await prisma.session.update({
    where: { id: session.id },
    data: {
      notes: resolvedNotes,
      activityCategory,
    },
  });

  revalidateSessionPaths(session.student.magicLinkToken, session.student.id);
  return { success: true };
}

/** Attach library media to an existing session. */
export async function addMediaToSession(input: {
  sessionId: string;
  mediaIds: string[];
  captionTemplate?: string;
}) {
  if (!(await isTeacherAuthed())) {
    return { error: "Please sign in first." };
  }

  if (input.mediaIds.length === 0) {
    return { error: "Pick at least one photo or video." };
  }

  const session = await loadSessionForEdit(input.sessionId);
  if (!session) {
    return { error: "That session wasn’t found." };
  }

  const media = await prisma.mediaAsset.findMany({
    where: { id: { in: input.mediaIds } },
  });
  if (media.length === 0) {
    return { error: "Those media items weren’t found." };
  }

  const caption = resolveStudentTemplate(
    input.captionTemplate || "{name}",
    session.student.name,
  );

  await prisma.$transaction(async (tx) => {
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

    await tx.mediaAsset.updateMany({
      where: { id: { in: media.map((m) => m.id) } },
      data: { assignedAt: new Date() },
    });
  });

  revalidateSessionPaths(session.student.magicLinkToken, session.student.id);
  return { success: true, added: media.length };
}

/** Remove one photo/video from a session timeline. */
export async function removeSessionPhoto(sessionPhotoId: string) {
  if (!(await isTeacherAuthed())) {
    return { error: "Please sign in first." };
  }

  const photo = await prisma.sessionPhoto.findUnique({
    where: { id: sessionPhotoId },
    select: {
      id: true,
      mediaId: true,
      sessionId: true,
      session: {
        select: {
          student: { select: { id: true, magicLinkToken: true } },
        },
      },
    },
  });
  if (!photo) {
    return { error: "That media wasn’t found on the session." };
  }

  await prisma.$transaction(async (tx) => {
    await tx.sessionPhoto.delete({ where: { id: photo.id } });

    if (photo.mediaId) {
      const remaining = await tx.sessionPhoto.count({
        where: { mediaId: photo.mediaId },
      });
      if (remaining === 0) {
        await tx.mediaAsset.update({
          where: { id: photo.mediaId },
          data: { assignedAt: null },
        });
      }
    }

    await deleteOrphanSessionIfEmpty(tx, photo.sessionId);
  });

  revalidateSessionPaths(
    photo.session.student.magicLinkToken,
    photo.session.student.id,
  );
  return { success: true };
}

/** Delete an entire session (note + media links) from a child’s timeline. */
export async function deleteSession(sessionId: string) {
  if (!(await isTeacherAuthed())) {
    return { error: "Please sign in first." };
  }

  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    select: {
      id: true,
      notes: true,
      student: { select: { id: true, magicLinkToken: true } },
      photos: { select: { id: true, mediaId: true } },
    },
  });
  if (!session) {
    return { error: "That session wasn’t found." };
  }

  const mediaIds = [
    ...new Set(
      session.photos
        .map((p) => p.mediaId)
        .filter((id): id is string => Boolean(id)),
    ),
  ];

  await prisma.$transaction(async (tx) => {
    await tx.session.delete({ where: { id: session.id } });

    for (const mediaId of mediaIds) {
      const remaining = await tx.sessionPhoto.count({ where: { mediaId } });
      if (remaining === 0) {
        await tx.mediaAsset.update({
          where: { id: mediaId },
          data: { assignedAt: null },
        });
      }
    }
  });

  revalidateSessionPaths(
    session.student.magicLinkToken,
    session.student.id,
  );
  return {
    success: true,
    wasPlaceholderOnly: isPlaceholderSessionNote(session.notes),
  };
}
