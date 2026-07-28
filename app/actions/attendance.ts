"use server";

import { revalidatePath } from "next/cache";
import type { AttendanceStatus } from "@/generated/prisma/enums";
import { isTeacherAuthed } from "@/lib/auth";
import { normalizeClassHours } from "@/lib/class-hours";
import { parseDateOnly } from "@/lib/dates";
import { prisma } from "@/lib/prisma";
import { revalidateParentPortal } from "@/lib/revalidate-parent";
import { isWeekendDate } from "@/lib/schedule";
import { activeStudentWhere } from "@/lib/students";

const DEFAULT_EXTRA_NOTE = "Extra class — teachers went the extra mile.";

/** Active roster with attendance marks for a single YYYY-MM-DD date. */
export async function getAttendanceBoardForDate(dateStr: string) {
  if (!(await isTeacherAuthed())) {
    return { error: "Please sign in first." };
  }

  const date = parseDateOnly(dateStr);
  if (Number.isNaN(date.getTime())) {
    return { error: "That date doesn’t look right." };
  }

  const students = await prisma.student.findMany({
    where: activeStudentWhere,
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      attendance: {
        where: { date },
        take: 1,
        select: {
          status: true,
          note: true,
          hoursAttended: true,
        },
      },
    },
  });

  const board = students.map((s) => {
    const mark = s.attendance[0];
    return {
      id: s.id,
      name: s.name,
      status: (mark?.status ?? null) as AttendanceStatus | null,
      note: mark?.note ?? null,
      hoursAttended: mark?.hoursAttended ?? null,
    };
  });

  const present = board
    .filter((s) => s.status === "PRESENT")
    .map((s) => ({ id: s.id, name: s.name }));

  const markedCount = board.filter((s) => s.status != null).length;

  return {
    success: true as const,
    date: dateStr,
    students: board,
    present,
    markedCount,
  };
}

export async function saveAttendanceForDate(input: {
  date: string;
  marks: {
    studentId: string;
    status: AttendanceStatus;
    note?: string;
    /** 2 = full class (default), 1 = short stay. Ignored when absent. */
    hoursAttended?: number;
    /** Weekend override — present on Sat/Sun counts as an extra class */
    isExtraClass?: boolean;
  }[];
}) {
  if (!(await isTeacherAuthed())) {
    return { error: "Please sign in first." };
  }

  const date = parseDateOnly(input.date);
  const weekend = isWeekendDate(date);

  await prisma.$transaction(
    input.marks.map((mark) => {
      const present = mark.status === "PRESENT";
      const hoursAttended = present
        ? normalizeClassHours(mark.hoursAttended)
        : 0;
      const isExtraClass = present && (weekend || Boolean(mark.isExtraClass));
      let note = mark.note?.trim() || null;
      if (present && isExtraClass && !note) {
        note = DEFAULT_EXTRA_NOTE;
      }

      return prisma.attendance.upsert({
        where: {
          studentId_date: { studentId: mark.studentId, date },
        },
        create: {
          studentId: mark.studentId,
          date,
          status: mark.status,
          hoursAttended,
          isExtraClass,
          note,
        },
        update: {
          status: mark.status,
          hoursAttended,
          isExtraClass,
          note,
        },
      });
    }),
  );

  revalidatePath("/admin/attendance");
  revalidatePath("/admin/students");
  revalidatePath("/admin/media");
  for (const mark of input.marks) {
    const student = await prisma.student.findUnique({
      where: { id: mark.studentId },
      select: { magicLinkToken: true },
    });
    if (student) revalidateParentPortal(student.magicLinkToken);
  }

  return { success: true };
}
