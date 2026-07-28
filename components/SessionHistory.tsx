"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  addMediaToSession,
  deleteSession,
  removeSessionPhoto,
  updateSessionDetails,
} from "@/app/actions/session-edit";
import {
  ActivityPicker,
  type ActivityOption,
} from "@/components/ActivityPicker";
import { VideoThumb } from "@/components/VideoThumb";
import { formatDisplayDate } from "@/lib/dates";

export type HistorySessionPhoto = {
  id: string;
  photoUrl: string;
  caption: string | null;
  mediaId: string | null;
  isVideo: boolean;
};

export type HistorySession = {
  id: string;
  sessionDate: string;
  activityCategory: string | null;
  notes: string;
  student: { id: string; name: string };
  photos: HistorySessionPhoto[];
};

type LibraryItem = {
  id: string;
  url: string;
  kind: string;
  originalName: string | null;
};

export function SessionHistory({
  sessions,
  library,
  initialActivities = [],
  focusSessionId,
  onFocusHandled,
  onSessionsChanged,
  embedded = false,
  hideStudentBadge = false,
  emptyHint,
}: {
  sessions: HistorySession[];
  library: LibraryItem[];
  initialActivities?: ActivityOption[];
  focusSessionId?: string | null;
  onFocusHandled?: () => void;
  /** Called after a successful edit so parent can reload (e.g. student modal). */
  onSessionsChanged?: () => void;
  embedded?: boolean;
  hideStudentBadge?: boolean;
  emptyHint?: string;
}) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [activities, setActivities] =
    useState<ActivityOption[]>(initialActivities);

  useEffect(() => {
    setActivities(initialActivities);
  }, [initialActivities]);

  function afterChange() {
    onSessionsChanged?.();
    router.refresh();
  }

  const editing = useMemo(
    () => sessions.find((s) => s.id === editingId) ?? null,
    [sessions, editingId],
  );

  useEffect(() => {
    if (!focusSessionId) return;
    setEditingId(focusSessionId);
    onFocusHandled?.();
  }, [focusSessionId, onFocusHandled]);

  // Keep editor open after refresh if session still exists
  useEffect(() => {
    if (editingId && !sessions.some((s) => s.id === editingId)) {
      setEditingId(null);
    }
  }, [sessions, editingId]);

  function openEdit(id: string) {
    setError(null);
    setMessage(null);
    setEditingId(id);
  }

  function closeEdit() {
    setEditingId(null);
    setError(null);
    setMessage(null);
  }

  const list = (
    <>
      <div className={`${embedded ? "mb-3" : ""} flex flex-wrap items-end justify-between gap-2`}>
        {!embedded ? (
          <div>
            <h2 className="font-display text-2xl font-bold text-forest">
              All sessions
            </h2>
            <p className="mt-1 text-sm text-ink-soft">
              Tap Edit to change the note or media for that day.
            </p>
          </div>
        ) : (
          <div />
        )}
        <span className="text-xs font-bold uppercase tracking-wide text-forest-soft">
          {sessions.length}{" "}
          {sessions.length === 1 ? "session" : "sessions"}
        </span>
      </div>

      {sessions.length === 0 ? (
        <div
          className={`${embedded ? "" : "mt-4 "}rounded-[1.25rem] border-2 border-dashed border-forest/25 bg-mint/30 px-5 py-8 text-center`}
        >
          <p className="font-display text-lg font-bold text-forest">
            No sessions yet
          </p>
          <p className="mt-1 text-sm text-ink-soft">
            {emptyHint ??
              "Publish a session from Session builder — it’ll show up here to edit later."}
          </p>
        </div>
      ) : (
        <ul
          className={`${embedded ? "" : "mt-4 "}grid gap-3 sm:grid-cols-2`}
        >
          {sessions.map((session) => {
            const date = new Date(session.sessionDate);
            const first = session.student.name.split(/\s+/)[0];
            return (
              <li
                key={session.id}
                className="flex flex-col rounded-[1.25rem] border-2 border-forest bg-white p-4"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                    <span className="rounded-full bg-yellow px-2.5 py-0.5 text-xs font-bold text-forest">
                      {formatDisplayDate(date)}
                    </span>
                    {!hideStudentBadge ? (
                      <span className="rounded-full border border-forest/30 bg-cream px-2.5 py-0.5 text-xs font-bold text-forest">
                        {first}
                      </span>
                    ) : null}
                    {session.activityCategory ? (
                      <span className="rounded-full bg-pastel-yellow px-2.5 py-0.5 text-xs font-bold text-forest">
                        {session.activityCategory}
                      </span>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    onClick={() => openEdit(session.id)}
                    className="btn-secondary shrink-0 !px-3 !py-1.5 text-sm"
                  >
                    Edit
                  </button>
                </div>
                <p className="mt-2 line-clamp-3 text-sm leading-snug text-ink">
                  {session.notes}
                </p>
                {session.photos.length > 0 ? (
                  <div className="mt-auto flex items-center gap-2 pt-3">
                    <div className="flex gap-1.5 overflow-hidden">
                      {session.photos.slice(0, 3).map((p) => (
                        <div
                          key={p.id}
                          className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg border border-forest/30"
                        >
                          {p.isVideo ? (
                            <VideoThumb
                              src={p.photoUrl}
                              className="h-full w-full"
                              showPlayBadge={false}
                            />
                          ) : (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={p.photoUrl}
                              alt=""
                              className="h-full w-full object-cover"
                            />
                          )}
                        </div>
                      ))}
                    </div>
                    <span className="text-xs font-semibold text-forest-soft">
                      {session.photos.length} media
                    </span>
                  </div>
                ) : (
                  <p className="mt-auto pt-3 text-xs font-semibold text-forest-soft">
                    Notes only
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </>
  );

  return (
    <section className={embedded ? "" : "mt-8"}>
      {list}

      {editing ? (
        <EditSessionModal
          session={editing}
          library={library}
          activities={activities}
          onActivitiesChange={setActivities}
          pending={pending}
          error={error}
          message={message}
          onClose={closeEdit}
          onSaveDetails={(notes, activityCategory) => {
            setError(null);
            setMessage(null);
            startTransition(async () => {
              const result = await updateSessionDetails({
                sessionId: editing.id,
                notes,
                activityCategory,
              });
              if (result.error) {
                setError(result.error);
                return;
              }
              setMessage("Session note saved.");
              afterChange();
            });
          }}
          onAddMedia={(mediaIds, captionTemplate) => {
            setError(null);
            setMessage(null);
            startTransition(async () => {
              const result = await addMediaToSession({
                sessionId: editing.id,
                mediaIds,
                captionTemplate,
              });
              if (result.error) {
                setError(result.error);
                return;
              }
              setMessage(`Added ${result.added} media.`);
              afterChange();
            });
          }}
          onRemovePhoto={(photoId) => {
            setError(null);
            setMessage(null);
            startTransition(async () => {
              const result = await removeSessionPhoto(photoId);
              if (result.error) {
                setError(result.error);
                return;
              }
              setMessage("Removed media from this session.");
              afterChange();
            });
          }}
          onDelete={() => {
            if (
              !confirm(
                `Delete this session for ${editing.student.name}? It will disappear from their timeline.`,
              )
            ) {
              return;
            }
            setError(null);
            setMessage(null);
            startTransition(async () => {
              const result = await deleteSession(editing.id);
              if (result.error) {
                setError(result.error);
                return;
              }
              closeEdit();
              afterChange();
            });
          }}
        />
      ) : null}
    </section>
  );
}

function EditSessionModal({
  session,
  library,
  activities,
  onActivitiesChange,
  pending,
  error,
  message,
  onClose,
  onSaveDetails,
  onAddMedia,
  onRemovePhoto,
  onDelete,
}: {
  session: HistorySession;
  library: LibraryItem[];
  activities: ActivityOption[];
  onActivitiesChange: (next: ActivityOption[]) => void;
  pending: boolean;
  error: string | null;
  message: string | null;
  onClose: () => void;
  onSaveDetails: (notes: string, activity: string) => void;
  onAddMedia: (mediaIds: string[], captionTemplate: string) => void;
  onRemovePhoto: (photoId: string) => void;
  onDelete: () => void;
}) {
  const [notes, setNotes] = useState(session.notes);
  const [activityCategory, setActivityCategory] = useState(
    session.activityCategory ?? "",
  );
  const [selectedAdd, setSelectedAdd] = useState<string[]>([]);
  const [captionTemplate, setCaptionTemplate] = useState(
    "{name} had a lovely moment in class today",
  );

  useEffect(() => {
    setNotes(session.notes);
    setActivityCategory(session.activityCategory ?? "");
    setSelectedAdd([]);
  }, [session]);

  const attachedMediaIds = new Set(
    session.photos.map((p) => p.mediaId).filter(Boolean),
  );
  const addableLibrary = library.filter((item) => !attachedMediaIds.has(item.id));

  const dateLabel = formatDisplayDate(new Date(session.sessionDate));
  const dateInput = session.sessionDate.slice(0, 10);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-forest/50 p-3 sm:items-center sm:p-6"
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-session-title"
        className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-[1.75rem] border-4 border-forest bg-cream shadow-[var(--shadow-chunky)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b-2 border-dashed border-forest bg-cream px-5 py-3 sm:px-6">
          <div>
            <h2
              id="edit-session-title"
              className="font-display text-xl font-bold text-forest"
            >
              Edit session
            </h2>
            <p className="text-sm font-semibold text-forest-soft">
              {session.student.name} · {dateLabel}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border-2 border-forest bg-yellow px-3 py-1 text-sm font-bold text-forest"
          >
            Close
          </button>
        </div>

        <div className="space-y-5 p-5 sm:p-6">
          <div className="grid gap-5 lg:grid-cols-2">
            <div className="space-y-4">
              <label className="block">
                <span className="mb-1 block text-sm font-bold text-forest">
                  Date
                </span>
                <input
                  type="date"
                  value={dateInput}
                  disabled
                  className="input-field opacity-70"
                />
                <span className="mt-1 block text-xs text-ink-soft">
                  Date can’t be changed — each child has one session per day.
                </span>
              </label>

              <label className="block">
                <span className="mb-1 block text-sm font-bold text-forest">
                  Session note
                </span>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={6}
                  className="input-field resize-none"
                />
                <span className="mt-1 block text-xs text-ink-soft">
                  {"{name}"} is resolved for this child when you save.
                </span>
              </label>

              <ActivityPicker
                activities={activities}
                value={activityCategory}
                onChange={setActivityCategory}
                onActivitiesChange={onActivitiesChange}
              />

              <button
                type="button"
                disabled={pending || !notes.trim()}
                onClick={() => onSaveDetails(notes, activityCategory)}
                className="btn-primary w-full disabled:opacity-60"
              >
                {pending ? "Saving…" : "Save note & activity"}
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <p className="mb-2 text-sm font-bold text-forest">
                  Media on this session ({session.photos.length})
                </p>
                {session.photos.length === 0 ? (
                  <p className="rounded-2xl border-2 border-dashed border-forest/25 bg-mint/30 px-4 py-6 text-center text-sm text-ink-soft">
                    No photos or videos yet.
                  </p>
                ) : (
                  <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {session.photos.map((p) => (
                      <li key={p.id} className="relative">
                        <div className="overflow-hidden rounded-xl border-2 border-forest">
                          {p.isVideo ? (
                            <VideoThumb src={p.photoUrl} />
                          ) : (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={p.photoUrl}
                              alt={p.caption ?? ""}
                              className="aspect-square w-full object-cover"
                            />
                          )}
                        </div>
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() => onRemovePhoto(p.id)}
                          className="absolute right-1 top-1 rounded-full border-2 border-forest bg-cream px-1.5 py-0.5 text-[10px] font-bold text-forest disabled:opacity-60"
                        >
                          ✕
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {addableLibrary.length > 0 ? (
                <div>
                  <p className="mb-2 text-sm font-bold text-forest">
                    Add from library
                  </p>
                  <ul className="grid max-h-56 grid-cols-3 gap-2 overflow-y-auto pr-1 sm:grid-cols-4">
                    {addableLibrary.slice(0, 16).map((item) => {
                      const on = selectedAdd.includes(item.id);
                      return (
                        <li key={item.id}>
                          <button
                            type="button"
                            onClick={() =>
                              setSelectedAdd((prev) =>
                                prev.includes(item.id)
                                  ? prev.filter((x) => x !== item.id)
                                  : [...prev, item.id],
                              )
                            }
                            className={`block w-full overflow-hidden rounded-xl border-2 border-forest p-0.5 ${
                              on ? "ring-4 ring-yellow" : ""
                            }`}
                          >
                            {item.kind === "video" ? (
                              <VideoThumb src={item.url} />
                            ) : (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={item.url}
                                alt={item.originalName ?? ""}
                                className="aspect-square w-full object-cover"
                              />
                            )}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                  {selectedAdd.length > 0 ? (
                    <div className="mt-3 space-y-2">
                      <input
                        value={captionTemplate}
                        onChange={(e) => setCaptionTemplate(e.target.value)}
                        className="input-field text-sm"
                        placeholder="Caption template"
                      />
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => onAddMedia(selectedAdd, captionTemplate)}
                        className="btn-secondary w-full !py-2.5 text-sm disabled:opacity-60"
                      >
                        Add {selectedAdd.length} to session
                      </button>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>

          {error ? (
            <p className="rounded-2xl border-2 border-red bg-pastel-pink px-3 py-2 text-sm font-semibold text-red-deep">
              {error}
            </p>
          ) : null}
          {message ? (
            <p className="rounded-2xl border-2 border-forest bg-mint px-3 py-2 text-sm font-semibold text-forest">
              {message}
            </p>
          ) : null}

          <button
            type="button"
            disabled={pending}
            onClick={onDelete}
            className="w-full rounded-full border-2 border-red bg-pastel-pink px-4 py-2.5 text-sm font-bold text-red-deep disabled:opacity-60"
          >
            Delete session
          </button>
        </div>
      </div>
    </div>
  );
}
