"use client";

import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useTransition,
} from "react";
import Link from "next/link";
import {
  deleteMediaAsset,
  publishSessionDay,
  toggleMediaHighlight,
  untagMediaFromStudents,
} from "@/app/actions/media";
import { getAttendanceBoardForDate } from "@/app/actions/attendance";
import {
  ActivityPicker,
  type ActivityOption,
} from "@/components/ActivityPicker";
import { QuickAttendanceModal } from "@/components/QuickAttendanceModal";
import { StudentMultiSelect } from "@/components/StudentMultiSelect";
import { toDateInputValue } from "@/lib/dates";
import { uploadMediaFile } from "@/lib/upload-client";
import { VideoThumb } from "@/components/VideoThumb";

type TaggedStudent = { id: string; name: string };

type MediaItem = {
  id: string;
  url: string;
  kind: string;
  originalName: string | null;
  createdAt: string;
  assignedAt: string | null;
  isHighlight: boolean;
  taggedStudents: TaggedStudent[];
};

type Student = { id: string; name: string };

export function MediaStudio({
  students,
  unassigned,
  recentAssigned,
  initialActivities,
}: {
  students: Student[];
  unassigned: MediaItem[];
  recentAssigned: MediaItem[];
  initialActivities: ActivityOption[];
}) {
  const router = useRouter();
  // Default: all children selected — easiest after-class flow
  const [selectedMedia, setSelectedMedia] = useState<string[]>([]);
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [sessionDate, setSessionDate] = useState(toDateInputValue);
  const [captionTemplate, setCaptionTemplate] = useState(
    "{name} had a lovely moment in class today",
  );
  const [sessionNote, setSessionNote] = useState("");
  const [activities, setActivities] =
    useState<ActivityOption[]>(initialActivities);
  const [activityCategory, setActivityCategory] = useState("");
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    setActivities(initialActivities);
  }, [initialActivities]);

  const [presentStudents, setPresentStudents] = useState<Student[]>([]);
  const [attendanceMarkedCount, setAttendanceMarkedCount] = useState(0);
  const [attendanceLoading, setAttendanceLoading] = useState(true);
  const [attendanceError, setAttendanceError] = useState<string | null>(null);
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);

  const refreshPresentForDate = useCallback(async (date: string) => {
    setAttendanceLoading(true);
    setAttendanceError(null);
    const result = await getAttendanceBoardForDate(date);
    if ("error" in result && result.error) {
      setAttendanceError(result.error);
      setPresentStudents([]);
      setAttendanceMarkedCount(0);
      setSelectedStudents([]);
      setAttendanceLoading(false);
      return;
    }
    if (!("success" in result) || !result.success) return;
    setPresentStudents(result.present);
    setAttendanceMarkedCount(result.markedCount);
    setSelectedStudents(result.present.map((s) => s.id));
    setAttendanceLoading(false);
  }, []);

  useEffect(() => {
    void refreshPresentForDate(sessionDate);
  }, [sessionDate, refreshPresentForDate]);

  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [managingTagsMediaId, setManagingTagsMediaId] = useState<string | null>(
    null,
  );
  const [untagStudentIds, setUntagStudentIds] = useState<string[]>([]);
  const [conflictSessions, setConflictSessions] = useState<
    { id: string; studentId: string; studentName: string }[]
  >([]);

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

  const managingItem = useMemo(
    () => library.find((item) => item.id === managingTagsMediaId) ?? null,
    [library, managingTagsMediaId],
  );

  useEffect(() => {
    if (!managingItem) {
      setUntagStudentIds([]);
      return;
    }
    const valid = new Set(managingItem.taggedStudents.map((s) => s.id));
    setUntagStudentIds((prev) => prev.filter((id) => valid.has(id)));
  }, [managingItem]);

  const previewName = useMemo(() => {
    const s =
      presentStudents.find((x) => selectedStudents.includes(x.id)) ??
      students.find((x) => selectedStudents.includes(x.id));
    return s?.name ?? presentStudents[0]?.name ?? students[0]?.name ?? "Aarav";
  }, [students, presentStudents, selectedStudents]);

  const previewFirst = previewName.split(/\s+/)[0] ?? previewName;

  function resolvePreview(template: string) {
    return template
      .replaceAll("{student name}", previewName)
      .replaceAll("{studentName}", previewName)
      .replaceAll("{name}", previewFirst)
      .replaceAll("{firstName}", previewFirst);
  }

  const captionPreview = resolvePreview(captionTemplate);
  const notePreview = sessionNote.trim()
    ? resolvePreview(sessionNote)
    : null;

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
        await uploadMediaFile(file, "session");
      }
      setMessage(`Uploaded ${files.length} file${files.length === 1 ? "" : "s"}.`);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  const canPublish =
    selectedStudents.length > 0 &&
    presentStudents.length > 0 &&
    (selectedMedia.length > 0 || sessionNote.trim().length > 0);

  function onPublish() {
    setError(null);
    setMessage(null);
    setConflictSessions([]);
    startTransition(async () => {
      const result = await publishSessionDay({
        mediaIds: selectedMedia,
        studentIds: selectedStudents,
        sessionDate,
        captionTemplate,
        sessionNote,
        activityCategory,
      });
      if (result.error) {
        setError(result.error);
        if ("conflict" in result && result.conflict) {
          setConflictSessions(result.existingSessions ?? []);
        }
        return;
      }
      const assignedTo = result.assignedTo ?? selectedStudents.length;
      const mediaCount = result.mediaCount ?? 0;
      const names = students
        .filter((s) => selectedStudents.includes(s.id))
        .map((s) => s.name.split(/\s+/)[0])
        .join(", ");
      const mediaBit =
        mediaCount > 0 ? ` with ${mediaCount} media` : " (notes only)";
      setMessage(`Published to ${assignedTo} children${mediaBit}: ${names}.`);
      setSelectedMedia([]);
      setSessionNote("");
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

  function openTagManager(item: MediaItem) {
    setError(null);
    setMessage(null);
    setManagingTagsMediaId(item.id);
    setUntagStudentIds([]);
  }

  function closeTagManager() {
    setManagingTagsMediaId(null);
    setUntagStudentIds([]);
  }

  function toggleUntagStudent(id: string) {
    setUntagStudentIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  function onUntag(studentIds: string[]) {
    if (!managingTagsMediaId || studentIds.length === 0) return;
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await untagMediaFromStudents({
        mediaId: managingTagsMediaId,
        studentIds,
      });
      if (result.error) {
        setError(result.error);
        return;
      }
      const names = managingItem?.taggedStudents
        .filter((s) => studentIds.includes(s.id))
        .map((s) => s.name.split(/\s+/)[0])
        .join(", ");
      setMessage(
        `Removed tag from ${result.removedFrom} ${
          result.removedFrom === 1 ? "child" : "children"
        }${names ? `: ${names}` : ""}.`,
      );
      setUntagStudentIds([]);
      // Close if this media no longer has tags (will move to unassigned)
      if (
        !managingItem ||
        managingItem.taggedStudents.every((s) => studentIds.includes(s.id))
      ) {
        closeTagManager();
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
            Upload to the library, then include them in today’s session. Photos
            &amp; short videos from your phone (up to 25MB)
          </span>
          <input
            type="file"
            accept="image/*,image/heic,image/heif,video/*,video/mp4,video/quicktime,.heic,.heif,.mov,.mp4"
            multiple
            className="hidden"
            disabled={uploading}
            onChange={(e) => {
              void onUpload(e.target.files);
              e.target.value = "";
            }}
          />
        </label>

        <div>
          <h2 className="font-display text-xl font-bold text-forest">
            Photos & videos ({library.length})
          </h2>
          <p className="mt-1 text-sm text-ink-soft">
            Tap to include in today’s session. Star standout shots for Memory
            Lane. Tap <span className="font-bold text-forest">TAGGED</span> to
            see or remove children.
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
                const tagCount = item.taggedStudents.length;
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
                        <VideoThumb src={item.url} />
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
                      <button
                        type="button"
                        title="See tagged children"
                        onClick={(e) => {
                          e.stopPropagation();
                          openTagManager(item);
                        }}
                        className="absolute bottom-2 left-2 rounded-full bg-forest px-2 py-0.5 text-[10px] font-bold text-yellow shadow-sm transition hover:bg-forest-soft"
                      >
                        TAGGED{tagCount > 0 ? ` · ${tagCount}` : ""}
                      </button>
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

      {managingItem ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-forest/50 p-3 sm:items-center sm:p-6"
          role="presentation"
          onClick={closeTagManager}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="manage-tags-title"
            className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-[1.75rem] border-4 border-forest bg-cream shadow-[var(--shadow-chunky)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 z-10 flex items-center justify-between border-b-2 border-dashed border-forest bg-cream px-4 py-3">
              <h2
                id="manage-tags-title"
                className="font-display text-lg font-bold text-forest"
              >
                Tagged children
              </h2>
              <button
                type="button"
                onClick={closeTagManager}
                className="rounded-full border-2 border-forest bg-yellow px-3 py-1 text-sm font-bold text-forest"
              >
                Close
              </button>
            </div>

            <div className="space-y-4 p-4">
              <div className="photo-frame mx-auto w-28 overflow-hidden p-1">
                {managingItem.kind === "video" ? (
                  <VideoThumb src={managingItem.url} />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={managingItem.url}
                    alt={managingItem.originalName ?? "Class media"}
                    className="aspect-square w-full object-cover"
                  />
                )}
              </div>

              {managingItem.taggedStudents.length === 0 ? (
                <p className="text-center text-sm text-ink-soft">
                  No children are tagged on this item anymore.
                </p>
              ) : (
                <>
                  <div className="rounded-2xl border-2 border-forest bg-cream p-3">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <span className="text-sm font-bold text-forest">
                        On timelines (
                        {managingItem.taggedStudents.length})
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          const allIds = managingItem.taggedStudents.map(
                            (s) => s.id,
                          );
                          setUntagStudentIds((prev) =>
                            prev.length === allIds.length ? [] : allIds,
                          );
                        }}
                        className="text-xs font-bold text-forest-soft underline"
                      >
                        {untagStudentIds.length ===
                        managingItem.taggedStudents.length
                          ? "Clear selection"
                          : "Select all"}
                      </button>
                    </div>
                    <ul className="max-h-56 space-y-1 overflow-y-auto pr-1">
                      {managingItem.taggedStudents.map((s) => {
                        const on = untagStudentIds.includes(s.id);
                        return (
                          <li key={s.id}>
                            <div
                              className={`flex items-center justify-between gap-2 rounded-xl px-2.5 py-2 text-sm font-semibold ${
                                on
                                  ? "bg-pastel-pink text-red-deep"
                                  : "bg-white text-forest"
                              }`}
                            >
                              <label className="flex min-w-0 cursor-pointer items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={on}
                                  onChange={() => toggleUntagStudent(s.id)}
                                  className="h-4 w-4 accent-[var(--red)]"
                                />
                                <span className="truncate">{s.name}</span>
                              </label>
                              <button
                                type="button"
                                disabled={pending}
                                onClick={() => onUntag([s.id])}
                                className="shrink-0 rounded-full border border-forest/30 bg-cream px-2 py-0.5 text-[11px] font-bold text-forest hover:border-red hover:bg-pastel-pink hover:text-red-deep disabled:opacity-60"
                              >
                                Remove
                              </button>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </div>

                  <div className="flex flex-col gap-2">
                    <button
                      type="button"
                      disabled={pending || untagStudentIds.length === 0}
                      onClick={() => onUntag(untagStudentIds)}
                      className="btn-primary w-full disabled:opacity-60"
                    >
                      {pending
                        ? "Removing…"
                        : untagStudentIds.length === 0
                          ? "Select children to remove"
                          : `Remove from ${untagStudentIds.length} ${
                              untagStudentIds.length === 1
                                ? "child"
                                : "children"
                            }`}
                    </button>
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() =>
                        onUntag(managingItem.taggedStudents.map((s) => s.id))
                      }
                      className="btn-secondary w-full !py-2.5 text-sm disabled:opacity-60"
                    >
                      Remove from everyone
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {showAttendanceModal ? (
        <QuickAttendanceModal
          date={sessionDate}
          onClose={() => setShowAttendanceModal(false)}
          onSaved={(present) => {
            setPresentStudents(present);
            setAttendanceMarkedCount(
              present.length > 0 ? Math.max(present.length, 1) : 0,
            );
            // Re-fetch full marked count for empty-present messaging
            void refreshPresentForDate(sessionDate).then(() => {
              setShowAttendanceModal(false);
            });
            setMessage(
              present.length > 0
                ? `${present.length} present — ready to build the session.`
                : "Attendance saved. Mark someone present to continue.",
            );
          }}
        />
      ) : null}

      <aside className="surface-card h-fit space-y-4 p-5 lg:sticky lg:top-4">
        <h2 className="font-display text-xl font-bold text-forest">
          Build today’s session
        </h2>
        <p className="text-sm text-ink-soft">
          Mark who’s present for the day, then add a note and/or photos and
          publish.
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

        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-bold text-forest">
              Children present
              {!attendanceLoading ? (
                <span className="font-semibold text-forest-soft">
                  {" "}
                  · {presentStudents.length}
                </span>
              ) : null}
            </p>
            <button
              type="button"
              onClick={() => setShowAttendanceModal(true)}
              className="text-xs font-bold text-forest-soft underline"
            >
              {presentStudents.length === 0
                ? "Mark attendance"
                : "Edit attendance"}
            </button>
          </div>

          {attendanceLoading ? (
            <p className="rounded-2xl border-2 border-dashed border-forest/25 bg-mint/30 px-3 py-4 text-center text-sm text-ink-soft">
              Checking who’s present…
            </p>
          ) : attendanceError ? (
            <p className="rounded-2xl border-2 border-red bg-pastel-pink px-3 py-3 text-sm font-semibold text-red-deep">
              {attendanceError}
            </p>
          ) : presentStudents.length === 0 ? (
            <div className="rounded-2xl border-2 border-forest bg-pastel-yellow/60 px-3 py-4 text-center">
              <p className="text-sm font-bold text-forest">
                {attendanceMarkedCount === 0
                  ? "Mark attendance for this day first"
                  : "No one is marked present for this day"}
              </p>
              <p className="mt-1 text-xs text-ink-soft">
                Only children marked present can be added to a session.
              </p>
              <button
                type="button"
                onClick={() => setShowAttendanceModal(true)}
                className="btn-secondary mt-3 !px-4 !py-2 text-sm"
              >
                Mark attendance
              </button>
            </div>
          ) : (
            <StudentMultiSelect
              students={presentStudents}
              selectedIds={selectedStudents}
              onChange={setSelectedStudents}
            />
          )}
        </div>

        <label className="block">
          <span className="mb-1 block text-sm font-bold text-forest">
            Session note
            {selectedMedia.length === 0 ? (
              <span className="font-semibold text-forest-soft">
                {" "}
                (required without media)
              </span>
            ) : (
              <span className="font-semibold text-forest-soft">
                {" "}
                (optional)
              </span>
            )}
          </span>
          <textarea
            value={sessionNote}
            onChange={(e) => setSessionNote(e.target.value)}
            rows={3}
            className="input-field resize-none"
            placeholder="{name} enjoyed today’s activity"
          />
          <span className="mt-1 block text-xs text-ink-soft">
            Use {"{name}"} or {"{student name}"}
            {notePreview ? <> — preview: “{notePreview}”</> : null}
          </span>
        </label>

        <ActivityPicker
          activities={activities}
          value={activityCategory}
          onChange={setActivityCategory}
          onActivitiesChange={setActivities}
        />

        {selectedMedia.length > 0 ? (
          <label className="block">
            <span className="mb-1 block text-sm font-bold text-forest">
              Photo caption template
            </span>
            <textarea
              value={captionTemplate}
              onChange={(e) => setCaptionTemplate(e.target.value)}
              rows={2}
              className="input-field resize-none"
              placeholder="{name} mixed colours with friends"
            />
            <span className="mt-1 block text-xs text-ink-soft">
              Use {"{name}"} or {"{student name}"} — preview: “{captionPreview}”
            </span>
          </label>
        ) : null}

        {selectedMedia.length > 0 ? (
          <p className="text-xs font-semibold text-forest-soft">
            {selectedMedia.length} media selected
          </p>
        ) : (
          <p className="text-xs text-ink-soft">
            No media selected — publish with a note only, or tap photos on the
            left.
          </p>
        )}

        {error && (
          <div className="space-y-2 rounded-2xl border-2 border-red bg-pastel-pink px-3 py-2 text-sm font-semibold text-red-deep">
            <p>{error}</p>
            {conflictSessions.length > 0 ? (
              <ul className="mt-1 space-y-1.5">
                {conflictSessions.map((s) => (
                  <li key={s.id}>
                    <Link
                      href={`/admin/students/${s.studentId}/sessions`}
                      className="font-bold underline"
                    >
                      Edit {s.studentName.split(/\s+/)[0]}’s sessions →
                    </Link>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        )}
        {message && (
          <p className="rounded-2xl border-2 border-forest bg-mint px-3 py-2 text-sm font-semibold text-forest">
            {message}
          </p>
        )}

        <button
          type="button"
          disabled={pending || !canPublish}
          onClick={onPublish}
          className="btn-primary w-full disabled:opacity-60"
        >
          {pending
            ? "Publishing…"
            : `Publish to ${selectedStudents.length} children`}
        </button>
      </aside>
    </div>
  );
}
