import Link from "next/link";
import { redirect } from "next/navigation";
import { logoutTeacher } from "@/app/actions/auth";
import { AdminNav } from "@/components/AdminNav";
import { ChildAvatar } from "@/components/ChildAvatar";
import { CopyLinkButton } from "@/components/CopyLinkButton";
import { DashDivider } from "@/components/DashDivider";
import { isTeacherAuthed } from "@/lib/auth";
import { formatDisplayDate } from "@/lib/dates";
import { parentPortalUrl } from "@/lib/magic-link";
import { prisma } from "@/lib/prisma";

export default async function AdminStudentsPage() {
  if (!(await isTeacherAuthed())) {
    redirect("/admin/login");
  }

  const students = await prisma.student.findMany({
    orderBy: { name: "asc" },
    include: {
      _count: { select: { sessions: true, attendance: true } },
    },
  });

  const peers = students.map((s) => ({ id: s.id, name: s.name }));

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold text-forest">
            Students
          </h1>
          <p className="mt-1 text-ink-soft">
            {students.length} enrolled · manage links, fees, and profiles
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/students/new" className="btn-primary !py-2 text-sm">
            + New student
          </Link>
          <form action={logoutTeacher}>
            <button
              type="submit"
              className="rounded-full border-2 border-forest bg-cream px-3 py-2 text-sm font-bold text-forest"
            >
              Out
            </button>
          </form>
        </div>
      </div>

      <DashDivider className="!my-4" />
      <AdminNav current="/admin/students" />

      <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {students.map((student, index) => {
          const url = parentPortalUrl(student, peers);
          return (
            <li
              key={student.id}
              className="surface-card animate-fade-up flex flex-col p-4"
              style={{ animationDelay: `${index * 25}ms` }}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex min-w-0 items-start gap-3">
                  <ChildAvatar
                    name={student.name}
                    photoUrl={student.photoUrl}
                    size="sm"
                  />
                  <div className="min-w-0">
                    <Link
                      href={`/admin/students/${student.id}`}
                      className="font-display text-lg font-bold text-forest hover:underline"
                    >
                      {student.name}
                    </Link>
                    <p className="text-sm text-ink-soft">
                      {student.parentName} · {student.parentPhone}
                    </p>
                  </div>
                </div>
                <CopyLinkButton url={url} />
              </div>

              <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold">
                <span className="rounded-full bg-mint px-2.5 py-1 text-forest">
                  Enrolled {formatDisplayDate(student.enrolledOn)}
                </span>
                <span className="rounded-full bg-pastel-yellow px-2.5 py-1 text-forest">
                  ₹{student.monthlyFee}/mo
                </span>
                <span className="rounded-full bg-pastel-blue px-2.5 py-1 text-forest">
                  {student._count.sessions} sessions
                </span>
              </div>

              <Link
                href={`/admin/students/${student.id}`}
                className="mt-3 text-sm font-bold text-forest-soft hover:text-forest"
              >
                Open profile →
              </Link>
            </li>
          );
        })}
      </ul>
    </main>
  );
}
