import { redirect } from "next/navigation";
import { logoutTeacher } from "@/app/actions/auth";
import { AdminNav } from "@/components/AdminNav";
import { AttendanceBoard } from "@/components/AttendanceBoard";
import { DashDivider } from "@/components/DashDivider";
import { EmptyState } from "@/components/EmptyState";
import { isTeacherAuthed } from "@/lib/auth";
import { parseDateOnly, toDateInputValue } from "@/lib/dates";
import { prisma } from "@/lib/prisma";
import { timed } from "@/lib/server-timing";
import { activeStudentWhere } from "@/lib/students";

export default async function AttendancePage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  return timed("page:admin/attendance", async () => {
  if (!(await isTeacherAuthed())) {
    redirect("/admin/login");
  }

  const { date: dateParam } = await searchParams;
  const date = dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam)
    ? dateParam
    : toDateInputValue();
  const dateObj = parseDateOnly(date);

  const students = await timed("query:admin/attendance:board", () =>
    prisma.student.findMany({
      where: activeStudentWhere,
      orderBy: { name: "asc" },
      include: {
        attendance: {
          where: { date: dateObj },
          take: 1,
        },
      },
    }),
  );

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold text-forest">
            Attendance
          </h1>
          <p className="mt-1 text-ink-soft">
            Mon–Fri classes (2h). Weekends are off unless you log an extra
            class — parents see that as you going the extra mile.
          </p>
        </div>
        <form action={logoutTeacher}>
          <button
            type="submit"
            className="rounded-full border-2 border-forest bg-cream px-3 py-2 text-sm font-bold text-forest"
          >
            Out
          </button>
        </form>
      </div>

      <DashDivider className="!my-4" />
      <AdminNav current="/admin/attendance" />

      {students.length === 0 ? (
        <EmptyState
          icon="☀️"
          title="No roster to mark yet"
          description="Add your first student, then you can take attendance for each class day here."
          actionHref="/admin/students/new"
          actionLabel="+ New student"
        />
      ) : (
        <AttendanceBoard
          key={date}
          initialDate={date}
          students={students.map((s) => ({
            id: s.id,
            name: s.name,
            status: s.attendance[0]?.status ?? null,
            note: s.attendance[0]?.note ?? null,
            hoursAttended: s.attendance[0]?.hoursAttended ?? null,
          }))}
        />
      )}
    </main>
  );
  });
}
