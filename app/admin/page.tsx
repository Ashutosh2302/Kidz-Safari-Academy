import Link from "next/link";
import { redirect } from "next/navigation";
import { logoutTeacher } from "@/app/actions/auth";
import { AdminNav } from "@/components/AdminNav";
import { DashDivider } from "@/components/DashDivider";
import { SessionLogForm } from "@/components/SessionLogForm";
import { isTeacherAuthed } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function AdminPage() {
  if (!(await isTeacherAuthed())) {
    redirect("/admin/login");
  }

  const students = await prisma.student.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

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

      <div className="surface-card animate-fade-up p-5 sm:p-7">
        {students.length === 0 ? (
          <p className="text-ink-soft">
            No students yet.{" "}
            <a href="/admin/students/new" className="font-bold text-forest underline">
              Enroll the first child
            </a>
            .
          </p>
        ) : (
          <SessionLogForm students={students} />
        )}
      </div>
    </main>
  );
}
