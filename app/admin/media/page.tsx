import Link from "next/link";
import { redirect } from "next/navigation";
import { logoutTeacher } from "@/app/actions/auth";
import { AdminNav } from "@/components/AdminNav";
import { DashDivider } from "@/components/DashDivider";
import { EmptyState } from "@/components/EmptyState";
import { MediaStudio } from "@/components/MediaStudio";
import { isTeacherAuthed } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { deleteAllOrphanPlaceholderSessions } from "@/lib/session-day";
import { timed } from "@/lib/server-timing";
import { activeStudentWhere } from "@/lib/students";

export default async function MediaPage() {
  return timed("page:admin/media", async () => {
  if (!(await isTeacherAuthed())) {
    redirect("/admin/login");
  }

  // Clear leftover empty timeline cards (placeholder/empty note, no photos)
  await timed("query:admin/media:orphan-cleanup", () =>
    deleteAllOrphanPlaceholderSessions(prisma),
  );

  const taggedStudentsInclude = {
    photos: {
      select: {
        id: true,
        session: {
          select: {
            student: { select: { id: true, name: true } },
          },
        },
      },
    },
  } as const;

  const [students, unassigned, recentAssigned, activities] = await timed(
    "query:admin/media:bundle",
    () =>
      Promise.all([
        prisma.student.findMany({
          where: activeStudentWhere,
          orderBy: { name: "asc" },
          select: { id: true, name: true },
        }),
        prisma.mediaAsset.findMany({
          where: { assignedAt: null },
          orderBy: { createdAt: "desc" },
          include: taggedStudentsInclude,
        }),
        prisma.mediaAsset.findMany({
          where: { assignedAt: { not: null } },
          orderBy: { assignedAt: "desc" },
          take: 12,
          include: taggedStudentsInclude,
        }),
        prisma.activity.findMany({
          orderBy: { name: "asc" },
          select: { id: true, name: true },
        }),
      ]),
  );

  const serialize = (items: typeof unassigned) =>
    items.map((m) => {
      const seen = new Set<string>();
      const taggedStudents: { id: string; name: string }[] = [];
      for (const photo of m.photos) {
        const student = photo.session.student;
        if (seen.has(student.id)) continue;
        seen.add(student.id);
        taggedStudents.push({ id: student.id, name: student.name });
      }
      taggedStudents.sort((a, b) => a.name.localeCompare(b.name));

      return {
        id: m.id,
        url: m.url,
        kind: m.kind,
        originalName: m.originalName,
        createdAt: m.createdAt.toISOString(),
        assignedAt: m.assignedAt?.toISOString() ?? null,
        isHighlight: m.isHighlight,
        taggedStudents,
      };
    });

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold text-forest">
            Session builder
          </h1>
          <p className="mt-1 text-ink-soft">
            Build today’s class — photos, videos, and notes — then publish.
            Edit past sessions from each child on{" "}
            <Link href="/admin/students" className="font-bold underline">
              Students
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
      </div>

      <DashDivider className="!my-4" />
      <AdminNav current="/admin/media" />

      {students.length === 0 ? (
        <EmptyState
          icon="📷"
          title="Nowhere to publish yet"
          description="Add a student first — then you can build a session with notes and media for their timeline."
          actionHref="/admin/students/new"
          actionLabel="+ New student"
        />
      ) : (
        <MediaStudio
          students={students}
          unassigned={serialize(unassigned)}
          recentAssigned={serialize(recentAssigned)}
          initialActivities={activities}
        />
      )}
    </main>
  );
  });
}
