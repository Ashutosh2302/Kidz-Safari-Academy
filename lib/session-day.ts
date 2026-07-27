import type { Prisma, PrismaClient } from "@/generated/prisma/client";
import { parseDateOnly } from "@/lib/dates";

/** Default note written when photos are tagged without a custom note */
export const PLACEHOLDER_SESSION_NOTE = "A little moment from class today.";

export type SessionDayClient = PrismaClient | Prisma.TransactionClient;

/** UTC calendar day key YYYY-MM-DD */
export function sessionDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function utcDayRange(sessionDate: Date) {
  const dayStart = new Date(sessionDate);
  const dayEnd = new Date(sessionDate);
  dayEnd.setUTCDate(dayEnd.getUTCDate() + 1);
  return { dayStart, dayEnd };
}

export function parseSessionDateInput(value: string) {
  return parseDateOnly(value);
}

/**
 * Merge notes when attaching more content to an existing day.
 * - Empty incoming → keep existing
 * - Existing empty/placeholder → take incoming
 * - Notes form (preferIncoming) → replace with the new note
 * - Otherwise keep existing if incoming is placeholder; append if both are real & different
 */
export function mergeSessionNotes(
  existing: string,
  incoming: string | null | undefined,
  options?: { preferIncoming?: boolean },
) {
  const prev = existing.trim();
  const next = (incoming ?? "").trim();

  if (!next) return prev || PLACEHOLDER_SESSION_NOTE;
  if (!prev || prev === PLACEHOLDER_SESSION_NOTE) return next;
  if (options?.preferIncoming) return next;
  if (next === PLACEHOLDER_SESSION_NOTE || prev === next) return prev;
  return `${prev}\n\n${next}`;
}

/** Day numbers from distinct calendar dates (chronological). */
export function dayNumberBySessionId<
  T extends { id: string; sessionDate: Date },
>(sessions: T[]) {
  const chronological = [...sessions].sort(
    (a, b) => a.sessionDate.getTime() - b.sessionDate.getTime(),
  );

  const dateOrder: string[] = [];
  const seen = new Set<string>();
  for (const s of chronological) {
    const key = sessionDateKey(s.sessionDate);
    if (!seen.has(key)) {
      seen.add(key);
      dateOrder.push(key);
    }
  }

  const dayByDate = new Map(dateOrder.map((key, i) => [key, i + 1]));
  const byId = new Map<string, number>();
  for (const s of chronological) {
    byId.set(s.id, dayByDate.get(sessionDateKey(s.sessionDate)) ?? 1);
  }
  return byId;
}

export function distinctSessionDayCount<T extends { sessionDate: Date }>(
  sessions: T[],
) {
  return new Set(sessions.map((s) => sessionDateKey(s.sessionDate))).size;
}

type UpsertArgs = {
  studentId: string;
  sessionDate: Date;
  notes?: string | null;
  activityCategory?: string;
  createdBy?: string;
  /** When true, incoming notes replace existing (Notes admin form) */
  preferIncomingNotes?: boolean;
};

/** Existing session for a student on a UTC calendar day, if any. */
export async function findSessionForStudentDay(
  db: SessionDayClient,
  studentId: string,
  sessionDate: Date,
) {
  const { dayStart, dayEnd } = utcDayRange(sessionDate);
  return db.session.findFirst({
    where: {
      studentId,
      sessionDate: { gte: dayStart, lt: dayEnd },
    },
    orderBy: { createdAt: "asc" },
  });
}

/**
 * One session per student per calendar day.
 * Finds an existing row for that UTC day, or creates one.
 */
export async function findOrUpsertSessionForDay(
  db: SessionDayClient,
  args: UpsertArgs,
) {
  const existing = await findSessionForStudentDay(
    db,
    args.studentId,
    args.sessionDate,
  );

  if (!existing) {
    const activity = args.activityCategory?.trim() || null;
    return db.session.create({
      data: {
        studentId: args.studentId,
        sessionDate: args.sessionDate,
        notes: (args.notes ?? "").trim() || PLACEHOLDER_SESSION_NOTE,
        activityCategory: activity,
        createdBy: args.createdBy ?? "teacher",
      },
    });
  }

  const notes = mergeSessionNotes(existing.notes, args.notes, {
    preferIncoming: args.preferIncomingNotes,
  });

  const data: Prisma.SessionUpdateInput = {};
  if (notes !== existing.notes) data.notes = notes;
  if (args.activityCategory !== undefined) {
    const nextActivity = args.activityCategory.trim() || null;
    if (nextActivity !== existing.activityCategory) {
      data.activityCategory = nextActivity;
    }
  }

  if (Object.keys(data).length === 0) return existing;

  return db.session.update({
    where: { id: existing.id },
    data,
  });
}

export function isPlaceholderSessionNote(notes: string) {
  return !notes.trim() || notes.trim() === PLACEHOLDER_SESSION_NOTE;
}

/**
 * Delete a session when it has no photos left and only a placeholder/empty note.
 * Keeps sessions with real teacher-written notes.
 */
export async function deleteOrphanSessionIfEmpty(
  db: SessionDayClient,
  sessionId: string,
) {
  const session = await db.session.findUnique({
    where: { id: sessionId },
    select: {
      id: true,
      notes: true,
      _count: { select: { photos: true } },
    },
  });
  if (!session) return false;
  if (session._count.photos > 0) return false;
  if (!isPlaceholderSessionNote(session.notes)) return false;

  await db.session.delete({ where: { id: sessionId } });
  return true;
}

/** Bulk cleanup of placeholder/empty-note sessions with no photos (existing empty timeline cards). */
export async function deleteAllOrphanPlaceholderSessions(db: SessionDayClient) {
  const orphans = await db.session.findMany({
    where: {
      OR: [{ notes: PLACEHOLDER_SESSION_NOTE }, { notes: "" }],
      photos: { none: {} },
    },
    select: {
      id: true,
      student: { select: { magicLinkToken: true } },
    },
  });

  if (orphans.length === 0) {
    return { deleted: 0, tokens: [] as string[] };
  }

  await db.session.deleteMany({
    where: { id: { in: orphans.map((s) => s.id) } },
  });

  return {
    deleted: orphans.length,
    tokens: [...new Set(orphans.map((s) => s.student.magicLinkToken))],
  };
}
