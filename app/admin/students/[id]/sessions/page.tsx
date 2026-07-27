import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { logoutTeacher } from "@/app/actions/auth";
import { AdminNav } from "@/components/AdminNav";
import { ChildAvatar } from "@/components/ChildAvatar";
import { DashDivider } from "@/components/DashDivider";
import { SessionHistory } from "@/components/SessionHistory";
import { isTeacherAuthed } from "@/lib/auth";
import { firstName, formatDisplayDate } from "@/lib/dates";
import { prisma } from "@/lib/prisma";
import { timed } from "@/lib/server-timing";
import { isStudentArchived } from "@/lib/students";

function isVideoUrl(url: string) {
  return /\.(mp4|mov|webm)(\?|$)/i.test(url) || url.includes("video");
}

export default async function StudentSessionsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return timed("page:admin/students/[id]/sessions", async () => {
    if (!(await isTeacherAuthed())) {
      redirect("/admin/login");
    }

    const { id } = await params;

    const [student, sessions, library, activities] = await timed(
      "query:admin/students/[id]/sessions",
      () =>
        Promise.all([
          prisma.student.findUnique({
            where: { id },
            select: {
              id: true,
              name: true,
              photoUrl: true,
              archivedAt: true,
              enrolledOn: true,
              _count: { select: { sessions: true } },
            },
          }),
          prisma.session.findMany({
            where: { studentId: id },
            orderBy: [{ sessionDate: "desc" }, { createdAt: "desc" }],
            take: 60,
            select: {
              id: true,
              sessionDate: true,
              notes: true,
              activityCategory: true,
              student: { select: { id: true, name: true } },
              photos: {
                orderBy: { createdAt: "asc" },
                select: {
                  id: true,
                  photoUrl: true,
                  caption: true,
                  mediaId: true,
                  media: { select: { kind: true } },
                },
              },
            },
          }),
          prisma.mediaAsset.findMany({
            orderBy: { createdAt: "desc" },
            take: 48,
            select: {
              id: true,
              url: true,
              kind: true,
              originalName: true,
            },
          }),
          prisma.activity.findMany({
            orderBy: { name: "asc" },
            select: { id: true, name: true },
          }),
        ]),
    );

    if (!student) notFound();

    const archived = isStudentArchived(student);
    const first = firstName(student.name);

    const history = sessions.map((s) => ({
      id: s.id,
      sessionDate: s.sessionDate.toISOString(),
      notes: s.notes,
      activityCategory: s.activityCategory,
      student: s.student,
      photos: s.photos.map((p) => ({
        id: p.id,
        photoUrl: p.photoUrl,
        caption: p.caption,
        mediaId: p.mediaId,
        isVideo: p.media?.kind === "video" || isVideoUrl(p.photoUrl),
      })),
    }));

    return (
      <main className="mx-auto min-h-screen max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <Link
              href="/admin/students"
              className="mb-2 inline-flex text-sm font-bold text-forest-soft"
            >
              ← Students
            </Link>
            <div className="mt-1 flex items-center gap-3">
              <ChildAvatar
                name={student.name}
                photoUrl={student.photoUrl}
                size="sm"
              />
              <div>
                <h1 className="font-display text-3xl font-bold text-forest">
                  {first}’s sessions
                </h1>
                <p className="mt-0.5 text-sm text-ink-soft">
                  {student._count.sessions}{" "}
                  {student._count.sessions === 1 ? "session" : "sessions"} ·
                  enrolled {formatDisplayDate(student.enrolledOn)}
                  {archived ? " · archived" : ""}
                </p>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href={`/admin/students/${student.id}`}
              className="rounded-full border-2 border-forest bg-cream px-3 py-2 text-sm font-bold text-forest"
            >
              Profile
            </Link>
            <Link
              href="/admin/media"
              className="btn-secondary !px-3 !py-2 text-sm"
            >
              Session builder
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
        <AdminNav
          current="/admin/students"
          branch={[
            { label: first, href: `/admin/students/${student.id}` },
            { label: "Sessions" },
          ]}
        />

        <p className="mb-4 text-sm text-ink-soft">
          View and edit past days for {first} — change notes, add or remove
          photos and videos.
        </p>

        <SessionHistory
          sessions={history}
          library={library}
          initialActivities={activities}
          hideStudentBadge
          emptyHint={`No sessions for ${first} yet. Publish one from Session builder.`}
        />
      </main>
    );
  });
}
