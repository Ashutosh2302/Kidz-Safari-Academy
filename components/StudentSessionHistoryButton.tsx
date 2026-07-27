import Link from "next/link";

/** Links to the dedicated per-child sessions management page. */
export function StudentSessionHistoryButton({
  studentId,
  sessionCount,
  className,
}: {
  studentId: string;
  studentName?: string;
  sessionCount: number;
  className?: string;
}) {
  return (
    <Link
      href={`/admin/students/${studentId}/sessions`}
      className={
        className ??
        "rounded-full border-2 border-forest bg-mint px-3 py-1.5 text-sm font-bold text-forest transition hover:bg-pastel-yellow"
      }
    >
      Session history
      {sessionCount > 0 ? ` · ${sessionCount}` : ""}
    </Link>
  );
}
