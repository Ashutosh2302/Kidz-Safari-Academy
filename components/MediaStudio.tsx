"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import {
  assignMediaToStudents,
  deleteMediaAsset,
  toggleMediaHighlight,
} from "@/app/actions/media";
import { StudentMultiSelect } from "@/components/StudentMultiSelect";
import { ACTIVITY_CATEGORIES, type ActivityCategory } from "@/lib/copy";
import { toDateInputValue } from "@/lib/dates";

type MediaItem = {
  id: string;
  url: string;
  kind: string;
  originalName: string | null;
  createdAt: string;
  assignedAt: string | null;
  isHighlight: boolean;
};

type Student = { id: string; name: string };

export function MediaStudio({
  students,
  unassigned,
  recentAssigned,
}: {
  students: Student[];
  unassigned: MediaItem[];
  recentAssigned: MediaItem[];
}) {
  const router = useRouter();
  // Default: all children selected — easiest after-class flow
  const [selectedMedia, setSelectedMedia] = useState<string[]>([]);
  const [selectedStudents, setSelectedStudents] = useState<string[]>(() =>
    students.map((s) => s.id),
  );
  const [sessionDate, setSessionDate] = useState(toDateInputValue);
  const [captionTemplate, setCaptionTemplate] = useState(
    "{name} had a lovely moment in class today",
  );
  const [sessionNote, setSessionNote] = useState("");
  const [activityCategory, setActivityCategory] =
    useState<ActivityCategory>("Circle Time");
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Keep already-tagged media selectable so you can add more children later
  const library = useMemo(() => {
    const map = new Map<string, MediaItem>();
    for (const item of [...unassigned, ...recentAssigned]) {
      map.set(item.id, item);
    }
    return [...map.values()].sort(
      (a, b) => +new Date(b.createdAt) - +new Date(a.createdAt),
    );
  }, [unassigned, recentAssigned]);

  const previewName = useMemo(() => {
    const s = students.find((x) => selectedStudents.includes(x.id));
    return s?.name ?? students[0]?.name ?? "Aarav";
  }, [students, selectedStudents]);

  const captionPreview = captionTemplate
    .replaceAll("{student name}", previewName)
    .replaceAll("{studentName}", previewName)
    .replaceAll("{name}", previewName.split(/\s+/)[0] ?? previewName)
    .replaceAll("{firstName}", previewName.split(/\s+/)[0] ?? previewName);

  function toggleMedia(id: string) {
    setSelectedMedia((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  async function onUpload(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    setError(null);
    setMessage(null);

    try {
      for (const file of Array.from(files)) {
        const body = new FormData();
        body.append("file", file);
        const res = await fetch("/api/upload", { method: "POST", body });
        const data = (await res.json()) as { error?: string };
        if (!res.ok) throw new Error(data.error ?? "Upload failed");
      }
      setMessage(`Uploaded ${files.length} file${files.length === 1 ? "" : "s"}.`);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  function onPublish() {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await assignMediaToStudents({
        mediaIds: selectedMedia,
        studentIds: selectedStudents,
        sessionDate,
        captionTemplate,
        sessionNote,
        activityCategory,
      });
      if (result.error) {
        setError(result.error);
        return;
      }
      const names = students
        .filter((s) => selectedStudents.includes(s.id))
        .map((s) => s.name.split(/\s+/)[0])
        .join(", ");
      setMessage(
        `Sent to ${result.assignedTo} children: ${names}. Open a magic link to check.`,
      );
      setSelectedMedia([]);
      router.refresh();
    });
  }

  function onDelete(id: string) {
    startTransition(async () => {
      const result = await deleteMediaAsset(id);
      if (result.error) {
        setError(result.error);
        return;
      }
      setSelectedMedia((prev) => prev.filter((x) => x !== id));
      router.refresh();
    });
  }

  function onToggleHighlight(id: string) {
    startTransition(async () => {
      const result = await toggleMediaHighlight(id);
      if (result.error) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
      <div className="space-y-4">
        <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-[1.5rem] border-2 border-dashed border-forest bg-mint px-6 py-10 text-center transition hover:bg-pastel-yellow">
          <span className="font-display text-xl font-bold text-forest">
            {uploading ? "Uploading…" : "Drop photos & videos here"}
          </span>
          <span className="text-sm text-ink-soft">
            Upload first — tag children after. jpg, png, webp, mp4 (up to 25MB)
          </span>
          <input
            type="file"
            accept="image/*,video/mp4,video/quicktime"
            multiple
            className="hidden"
            disabled={uploading}
            onChange={(e) => onUpload(e.target.files)}
          />
        </label>

        <div>
          <h2 className="font-display text-xl font-bold text-forest">
            Media library ({library.length})
          </h2>
          <p className="mt-1 text-sm text-ink-soft">
            Tap to select. Star standout shots for Memory Lane. Already-tagged
            items can be sent to more children.
          </p>
          {library.length === 0 ? (
            <div className="mt-4 flex flex-col items-center rounded-[1.25rem] border-2 border-dashed border-forest/25 bg-mint/30 px-6 py-10 text-center">
              <span
                className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-forest bg-cream text-2xl shadow-[2px_2px_0_rgba(0,0,0,0.12)]"
                aria-hidden
              >
                📷
              </span>
              <h3 className="mt-4 font-display text-xl font-bold text-forest">
                No photos yet
              </h3>
              <p className="mt-1 max-w-sm text-sm text-ink-soft">
                Upload a few moments from class above, then tag children to
                send them to parent timelines.
              </p>
            </div>
          ) : (
            <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {library.map((item) => {
                const on = selectedMedia.includes(item.id);
                return (
                  <li key={item.id} className="relative">
                    <button
                      type="button"
                      onClick={() => toggleMedia(item.id)}
                      className={`photo-frame block w-full overflow-hidden p-1 ${
                        on ? "ring-4 ring-yellow" : ""
                      }`}
                    >
                      {item.kind === "video" ? (
                        <video
                          src={item.url}
                          className="aspect-square w-full object-cover"
                          muted
                        />
                      ) : (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={item.url}
                          alt={item.originalName ?? "Class media"}
                          className="aspect-square w-full object-cover"
                        />
                      )}
                    </button>
                    <button
                      type="button"
                      title={
                        item.isHighlight
                          ? "Unmark highlight"
                          : "Flag as highlight for Memory Lane"
                      }
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleHighlight(item.id);
                      }}
                      className={`absolute left-2 top-2 rounded-full border-2 border-forest px-2 py-0.5 text-sm font-bold shadow-sm ${
                        item.isHighlight
                          ? "bg-yellow text-forest"
                          : "bg-cream/95 text-forest-soft"
                      }`}
                    >
                      ★
                    </button>
                    {!item.assignedAt && (
                      <button
                        type="button"
                        onClick={() => onDelete(item.id)}
                        className="absolute right-2 top-2 rounded-full border-2 border-forest bg-cream px-2 py-0.5 text-xs font-bold text-forest"
                      >
                        ✕
                      </button>
                    )}
                    {item.assignedAt && (
                      <span className="absolute bottom-2 left-2 rounded-full bg-forest px-2 py-0.5 text-[10px] font-bold text-yellow">
                        TAGGED
                      </span>
                    )}
                    {item.kind === "video" && (
                      <span className="absolute bottom-2 right-2 rounded-full bg-red px-2 py-0.5 text-[10px] font-bold text-white">
                        VIDEO
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      <aside className="surface-card h-fit space-y-4 p-5 lg:sticky lg:top-4">
        <h2 className="font-display text-xl font-bold text-forest">
          Tag & send to timelines
        </h2>
        <p className="text-sm text-ink-soft">
          Select media on the left, confirm children (all selected by default),
          then publish.
        </p>

        <label className="block">
          <span className="mb-1 block text-sm font-bold text-forest">Date</span>
          <input
            type="date"
            value={sessionDate}
            onChange={(e) => setSessionDate(e.target.value)}
            className="input-field"
          />
        </label>

        <StudentMultiSelect
          students={students}
          selectedIds={selectedStudents}
          onChange={setSelectedStudents}
        />

        <label className="block">
          <span className="mb-1 block text-sm font-bold text-forest">
            Caption template
          </span>
          <textarea
            value={captionTemplate}
            onChange={(e) => setCaptionTemplate(e.target.value)}
            rows={3}
            className="input-field resize-none"
            placeholder="{name} mixed colours with friends"
          />
          <span className="mt-1 block text-xs text-ink-soft">
            Use {"{name}"} or {"{student name}"} — preview: “{captionPreview}”
          </span>
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-bold text-forest">
            Activity
          </span>
          <select
            value={activityCategory}
            onChange={(e) =>
              setActivityCategory(e.target.value as ActivityCategory)
            }
            className="input-field"
          >
            {ACTIVITY_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-bold text-forest">
            Session note (optional)
          </span>
          <input
            value={sessionNote}
            onChange={(e) => setSessionNote(e.target.value)}
            className="input-field"
            placeholder="Used if the child has no note for that day yet"
          />
        </label>

        {error && (
          <p className="rounded-2xl border-2 border-red bg-pastel-pink px-3 py-2 text-sm font-semibold text-red-deep">
            {error}
          </p>
        )}
        {message && (
          <p className="rounded-2xl border-2 border-forest bg-mint px-3 py-2 text-sm font-semibold text-forest">
            {message}
          </p>
        )}

        <button
          type="button"
          disabled={
            pending || selectedMedia.length === 0 || selectedStudents.length === 0
          }
          onClick={onPublish}
          className="btn-primary w-full disabled:opacity-60"
        >
          {pending
            ? "Sending…"
            : `Send to ${selectedStudents.length} children`}
        </button>
      </aside>
    </div>
  );
}
