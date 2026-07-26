import { redirect } from "next/navigation";
import { logoutTeacher } from "@/app/actions/auth";
import { AdminNav } from "@/components/AdminNav";
import { DashDivider } from "@/components/DashDivider";
import { MilestoneBoard } from "@/components/MilestoneBoard";
import { isTeacherAuthed } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function MilestonesPage() {
  if (!(await isTeacherAuthed())) {
    redirect("/admin/login");
  }

  const [students, milestones, unlocked] = await Promise.all([
    prisma.student.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.milestone.findMany({ orderBy: [{ category: "asc" }, { name: "asc" }] }),
    prisma.studentMilestone.findMany({
      select: { studentId: true, milestoneId: true, note: true },
    }),
  ]);

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

      <MilestoneBoard
        students={students}
        milestones={milestones}
        unlocked={unlocked}
      />
    </main>
  );
}
