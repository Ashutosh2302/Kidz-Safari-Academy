import Link from "next/link";
import { redirect } from "next/navigation";
import { logoutTeacher } from "@/app/actions/auth";
import { AdminNav } from "@/components/AdminNav";
import { ArchiveStudentButton } from "@/components/ArchiveStudentButton";
import { ChildAvatar } from "@/components/ChildAvatar";
import { CopyLinkButton } from "@/components/CopyLinkButton";
import { DashDivider } from "@/components/DashDivider";
import { EmptyState } from "@/components/EmptyState";
import { OpenProfileButton } from "@/components/OpenProfileButton";
import { isTeacherAuthed } from "@/lib/auth";
import { formatDisplayDate } from "@/lib/dates";
import { parentPortalUrl } from "@/lib/magic-link";
import { prisma } from "@/lib/prisma";
import { timed } from "@/lib/server-timing";
import { studentActiveWhere } from "@/lib/students";

export default async function AdminStudentsPage({
  searchParams,
}: {
  searchParams: Promise<{ archived?: string }>;
}) {
  return timed("page:admin/students", async () => {
  if (!(await isTeacherAuthed())) {
    redirect("/admin/login");
  }

  const { archived: archivedParam } = await searchParams;
  const showArchived = archivedParam === "1";

  const [students, archivedCount] = await timed(
    "query:admin/students:list",
    () =>
      Promise.all([
        prisma.student.findMany({
          where: studentActiveWhere(showArchived),
          orderBy: { name: "asc" },
          include: {
            _count: { select: { sessions: true, attendance: true } },
          },
        }),
        prisma.student.count({ where: { archivedAt: { not: null } } }),
      ]),
  );

  const activeStudents = showArchived
    ? students.filter((s) => !s.archivedAt)
    : students;
  const archivedStudents = showArchived
    ? students.filter((s) => s.archivedAt)
    : [];

  const peers = students.map((s) => ({ id: s.id, name: s.name }));
  const activeCount = showArchived
    ? activeStudents.length
    : students.length;

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold text-forest">
            Students
          </h1>
          <p className="mt-1 text-ink-soft">
            {activeCount} enrolled
            {archivedCount > 0 ? ` · ${archivedCount} archived` : ""} · manage
            links, fees, and profiles
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

      {archivedCount > 0 || showArchived ? (
        <div className="mb-4">
          <Link
            href={
              showArchived ? "/admin/students" : "/admin/students?archived=1"
            }
            className={`inline-flex rounded-full border-2 border-forest px-3 py-1.5 text-xs font-bold ${
              showArchived
                ? "bg-yellow text-forest"
                : "bg-cream text-forest"
            }`}
          >
            {showArchived
              ? "Hide archived students"
              : `Show archived students (${archivedCount})`}
          </Link>
        </div>
      ) : null}

      {!showArchived && students.length === 0 ? (
        <EmptyState
          icon="🎒"
          title="No students yet"
          description="Add your first Gentle Sprouts explorer to get started — magic links, attendance, and fees all begin here."
          actionHref="/admin/students/new"
          actionLabel="+ New student"
        />
      ) : (
        <>
          {activeStudents.length > 0 ? (
            <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {activeStudents.map((student, index) => (
                <StudentCard
                  key={student.id}
                  student={student}
                  peers={peers}
                  index={index}
                />
              ))}
            </ul>
          ) : showArchived ? (
            <EmptyState
              icon="🌱"
              title="No active students"
              description="Everyone on the roster is archived. Restore a child below, or enroll someone new."
              actionHref="/admin/students/new"
              actionLabel="+ New student"
            />
          ) : null}

          {showArchived && archivedStudents.length > 0 ? (
            <section className="mt-8">
              <h2 className="font-display text-xl font-bold text-forest">
                Archived
              </h2>
              <p className="mt-1 text-sm text-ink-soft">
                History is kept · parent links are paused · restore anytime
              </p>
              <ul className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {archivedStudents.map((student, index) => (
                  <StudentCard
                    key={student.id}
                    student={student}
                    peers={peers}
                    index={index}
                    archived
                  />
                ))}
              </ul>
            </section>
          ) : null}
        </>
      )}
    </main>
  );
  });
}

function StudentCard({
  student,
  peers,
  index,
  archived = false,
}: {
  student: {
    id: string;
    name: string;
    parentName: string;
    parentPhone: string;
    photoUrl: string | null;
    enrolledOn: Date;
    monthlyFee: number;
    magicLinkToken: string;
    archivedAt: Date | null;
    _count: { sessions: number; attendance: number };
  };
  peers: { id: string; name: string }[];
  index: number;
  archived?: boolean;
}) {
  const url = parentPortalUrl(student, peers);

  return (
    <li
      className={`surface-card animate-fade-up flex flex-col p-4 ${
        archived ? "opacity-80" : ""
      }`}
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
        {!archived ? (
          <div className="flex shrink-0 items-center gap-1.5">
            <OpenProfileButton url={url} />
            <CopyLinkButton url={url} />
          </div>
        ) : null}
      </div>

      <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold">
        {archived ? (
          <span className="rounded-full bg-pastel-pink px-2.5 py-1 text-red-deep">
            Archived
          </span>
        ) : null}
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

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <Link
          href={`/admin/students/${student.id}`}
          className="text-sm font-bold text-forest-soft hover:text-forest"
        >
          Open profile →
        </Link>
      </div>

      <div className="mt-3 border-t-2 border-dashed border-forest/15 pt-3">
        <ArchiveStudentButton
          studentId={student.id}
          studentName={student.name}
          archived={archived}
        />
      </div>
    </li>
  );
}
