import { redirect } from "next/navigation";
import { logoutTeacher } from "@/app/actions/auth";
import { AdminNav } from "@/components/AdminNav";
import { DashDivider } from "@/components/DashDivider";
import { EmptyState } from "@/components/EmptyState";
import { MilestoneBoard } from "@/components/MilestoneBoard";
import { isTeacherAuthed } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { timed } from "@/lib/server-timing";
import { activeStudentWhere } from "@/lib/students";

export default async function MilestonesPage() {
  return timed("page:admin/milestones", async () => {
  if (!(await isTeacherAuthed())) {
    redirect("/admin/login");
  }

  const [students, milestones, unlocked] = await timed(
    "query:admin/milestones:bundle",
    () =>
      Promise.all([
        prisma.student.findMany({
          where: activeStudentWhere,
          orderBy: { name: "asc" },
          select: { id: true, name: true },
        }),
        prisma.milestone.findMany({
          orderBy: [{ category: "asc" }, { name: "asc" }],
        }),
        prisma.studentMilestone.findMany({
          select: { studentId: true, milestoneId: true, note: true },
        }),
      ]),
  );

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold text-forest">
            Leaps
          </h1>
          <p className="mt-1 text-ink-soft">
            Unlock leaps with a short note, or create a new leap type on the
            spot when class sparks something new.
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
      <AdminNav current="/admin/milestones" />

      {students.length === 0 ? (
        <EmptyState
          icon="🦋"
          title="Leaps need a little explorer"
          description="Enroll a student to unlock leaps after class — growth moments parents love to see."
          actionHref="/admin/students/new"
          actionLabel="+ New student"
        />
      ) : (
        <MilestoneBoard
          students={students}
          milestones={milestones}
          unlocked={unlocked}
        />
      )}
    </main>
  );
  });
}
