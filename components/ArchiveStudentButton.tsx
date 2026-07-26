"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { archiveStudent, restoreStudent } from "@/app/actions/students";

export function ArchiveStudentButton({
  studentId,
  studentName,
  archived,
}: {
  studentId: string;
  studentName: string;
  archived: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onArchive() {
    const ok = window.confirm(
      `Remove ${studentName} from your active roster?\n\n` +
        `Their sessions, photos, leaps, and fee history will be preserved. ` +
        `You can find them later under “Show archived students”. ` +
        `Their parent magic link will stop working.`,
    );
    if (!ok) return;

    setError(null);
    startTransition(async () => {
      const result = await archiveStudent(studentId);
      if (result.error) {
        setError(result.error);
        return;
      }
      router.push("/admin/students");
      router.refresh();
    });
  }

  function onRestore() {
    setError(null);
    startTransition(async () => {
      const result = await restoreStudent(studentId);
      if (result.error) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  if (archived) {
    return (
      <div className="space-y-1">
        <button
          type="button"
          disabled={pending}
          onClick={onRestore}
          className="btn-secondary w-full !py-2.5 text-sm disabled:opacity-60"
        >
          {pending ? "Restoring…" : "Restore to active roster"}
        </button>
        {error ? (
          <p className="text-xs font-semibold text-red-deep">{error}</p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <button
        type="button"
        disabled={pending}
        onClick={onArchive}
        className="w-full rounded-full border-2 border-forest bg-pastel-pink px-3 py-2.5 text-sm font-bold text-red-deep disabled:opacity-60"
      >
        {pending ? "Removing…" : "Remove from roster"}
      </button>
      {error ? (
        <p className="text-xs font-semibold text-red-deep">{error}</p>
      ) : null}
    </div>
  );
}
