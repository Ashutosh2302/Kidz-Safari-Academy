"use server";

import { revalidatePath } from "next/cache";
import type { AttendanceStatus } from "@/generated/prisma/enums";
import { isTeacherAuthed } from "@/lib/auth";
import { normalizeClassHours } from "@/lib/class-hours";
import { parseDateOnly } from "@/lib/dates";
import { prisma } from "@/lib/prisma";
import { revalidateParentPortal } from "@/lib/revalidate-parent";
import { isWeekendDate } from "@/lib/schedule";

const DEFAULT_EXTRA_NOTE = "Extra class — teachers went the extra mile.";

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
  for (const mark of input.marks) {
    const student = await prisma.student.findUnique({
      where: { id: mark.studentId },
      select: { magicLinkToken: true },
    });
    if (student) revalidateParentPortal(student.magicLinkToken);
  }

  return { success: true };
}
