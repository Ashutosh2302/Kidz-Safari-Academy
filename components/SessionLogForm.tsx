"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { createSession } from "@/app/actions/sessions";
import { toDateInputValue } from "@/lib/dates";

type StudentOption = {
  id: string;
  name: string;
};

export function SessionLogForm({ students }: { students: StudentOption[] }) {
  const router = useRouter();
  const [studentId, setStudentId] = useState(students[0]?.id ?? "");
  const [sessionDate, setSessionDate] = useState(toDateInputValue);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    startTransition(async () => {
      const result = await createSession({
        studentId,
        sessionDate,
        notes,
        photoUrls: [],
      });

      if (result.error) {
        setError(result.error);
        return;
      }

      setSuccess(true);
      setNotes("");
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <p className="rounded-2xl border-2 border-dashed border-forest bg-mint px-4 py-3 text-sm text-forest">
        Photos & videos? Use{" "}
        <Link href="/admin/media" className="font-bold underline">
          Photos & videos
        </Link>{" "}
        — upload once, tag many children.
      </p>

      <label className="block">
        <span className="mb-1.5 block text-sm font-bold text-forest">Child</span>
        <select
          value={studentId}
          onChange={(e) => setStudentId(e.target.value)}
          required
          className="input-field"
        >
          {students.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className="mb-1.5 block text-sm font-bold text-forest">Date</span>
        <input
          type="date"
          value={sessionDate}
          onChange={(e) => setSessionDate(e.target.value)}
          required
          className="input-field"
        />
      </label>

      <label className="block">
        <span className="mb-1.5 block text-sm font-bold text-forest">
          Today&apos;s note
        </span>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          required
          rows={4}
          placeholder="Sang the welcome song and built a tall tower…"
          className="input-field resize-none"
        />
      </label>

      {error && (
        <p className="rounded-2xl border-2 border-red bg-pastel-pink px-4 py-3 text-sm font-semibold text-red-deep">
          {error}
        </p>
      )}

      {success && (
        <p className="rounded-2xl border-2 border-forest bg-mint px-4 py-3 text-sm font-semibold text-forest">
          Note saved. Add photos from Photos & videos anytime.
        </p>
      )}

      <button
        type="submit"
        disabled={pending || !studentId}
        className="btn-primary w-full disabled:opacity-60"
      >
        {pending ? "Saving…" : "Save note"}
      </button>
    </form>
  );
}
