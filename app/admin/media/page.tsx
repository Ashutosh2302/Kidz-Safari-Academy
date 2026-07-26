import { redirect } from "next/navigation";
import { logoutTeacher } from "@/app/actions/auth";
import { AdminNav } from "@/components/AdminNav";
import { DashDivider } from "@/components/DashDivider";
import { MediaStudio } from "@/components/MediaStudio";
import { isTeacherAuthed } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function MediaPage() {
  if (!(await isTeacherAuthed())) {
    redirect("/admin/login");
  }

  const [students, unassigned, recentAssigned] = await Promise.all([
    prisma.student.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.mediaAsset.findMany({
      where: { assignedAt: null },
      orderBy: { createdAt: "desc" },
    }),
    prisma.mediaAsset.findMany({
      where: { assignedAt: { not: null } },
      orderBy: { assignedAt: "desc" },
      take: 12,
    }),
  ]);

  const serialize = (items: typeof unassigned) =>
    items.map((m) => ({
      id: m.id,
      url: m.url,
      kind: m.kind,
      originalName: m.originalName,
      createdAt: m.createdAt.toISOString(),
      assignedAt: m.assignedAt?.toISOString() ?? null,
      isHighlight: m.isHighlight,
    }));

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold text-forest">
            Photos & videos
          </h1>
          <p className="mt-1 text-ink-soft">
            Upload once, tag children, send to their timelines.
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

      <MediaStudio
        students={students}
        unassigned={serialize(unassigned)}
        recentAssigned={serialize(recentAssigned)}
      />
    </main>
  );
}
