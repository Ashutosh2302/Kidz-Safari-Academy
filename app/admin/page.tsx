import Link from "next/link";
import { redirect } from "next/navigation";
import { logoutTeacher } from "@/app/actions/auth";
import { AdminNav } from "@/components/AdminNav";
import { DashDivider } from "@/components/DashDivider";
import { EmptyState } from "@/components/EmptyState";
import { SessionLogForm } from "@/components/SessionLogForm";
import { isTeacherAuthed } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { timed } from "@/lib/server-timing";
import { activeStudentWhere } from "@/lib/students";

export default async function AdminPage() {
  return timed("page:admin/notes", async () => {
  if (!(await isTeacherAuthed())) {
    redirect("/admin/login");
  }

  const students = await timed("query:admin/notes:students", () =>
    prisma.student.findMany({
      where: activeStudentWhere,
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  );

  return (
    <main className="mx-auto min-h-screen max-w-3xl px-4 py-6 sm:px-6 lg:px-8">
      <header className="animate-fade-up mb-2 flex items-start justify-between gap-3">
        <div>
          <span className="pill-green">After class</span>
          <h1 className="mt-2 font-display text-3xl font-bold text-forest">
            Session notes
          </h1>
          <p className="mt-1 text-ink-soft">
            Quick written note for one child. For photos, use{" "}
            <Link href="/admin/media" className="font-bold underline">
              Photos & videos
            </Link>
            .
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
      </header>

      <DashDivider className="!my-4" />
      <AdminNav current="/admin" />

      {students.length === 0 ? (
        <EmptyState
          icon="📝"
          title="No one to write about yet"
          description="Enroll a student first, then come back here to jot a warm note after class."
          actionHref="/admin/students/new"
          actionLabel="+ New student"
        />
      ) : (
        <div className="surface-card animate-fade-up p-5 sm:p-7">
          <SessionLogForm students={students} />
        </div>
      )}
    </main>
  );
  });
}
