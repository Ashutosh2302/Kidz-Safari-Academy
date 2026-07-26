"use client";

import { useMemo, useState, useTransition } from "react";
import {
  createMilestone,
  toggleStudentMilestone,
} from "@/app/actions/milestones";
import {
  DEFAULT_LEAP_CATEGORY,
  LEAP_CATEGORIES,
  LEAP_ICONS,
} from "@/lib/copy";
import { toDateInputValue } from "@/lib/dates";

type Milestone = {
  id: string;
  name: string;
  category: string;
  icon: string;
};

type Unlocked = {
  studentId: string;
  milestoneId: string;
  note: string | null;
};

export function MilestoneBoard({
  students,
  milestones: initialMilestones,
  unlocked,
}: {
  students: { id: string; name: string }[];
  milestones: Milestone[];
  unlocked: Unlocked[];
}) {
  const [studentId, setStudentId] = useState(students[0]?.id ?? "");
  const [milestones, setMilestones] = useState(initialMilestones);
  const [pending, startTransition] = useTransition();
  const [localUnlocked, setLocalUnlocked] = useState(unlocked);
  const [message, setMessage] = useState<string | null>(null);
  const [draftingId, setDraftingId] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState("");
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newCategory, setNewCategory] = useState<string>(DEFAULT_LEAP_CATEGORY);
  const [customCategory, setCustomCategory] = useState("");
  const [newIcon, setNewIcon] = useState<string>(LEAP_ICONS[0]);

  const unlockedForChild = useMemo(
    () => localUnlocked.filter((u) => u.studentId === studentId),
    [localUnlocked, studentId],
  );

  const unlockedByMilestone = useMemo(() => {
    const map = new Map<string, Unlocked>();
    for (const u of unlockedForChild) map.set(u.milestoneId, u);
    return map;
  }, [unlockedForChild]);

  const categoryOptions = useMemo(() => {
    const fromLib = milestones.map((m) => m.category);
    return [...new Set([...LEAP_CATEGORIES, ...fromLib])].sort((a, b) =>
      a.localeCompare(b),
    );
  }, [milestones]);

  const byCategory = useMemo(() => {
    const map = new Map<string, Milestone[]>();
    for (const m of milestones) {
      const list = map.get(m.category) ?? [];
      list.push(m);
      map.set(m.category, list);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [milestones]);

  function beginUnlock(milestoneId: string) {
    setMessage(null);
    setCreating(false);
    setDraftingId(milestoneId);
    setNoteDraft("");
  }

  function cancelDraft() {
    setDraftingId(null);
    setNoteDraft("");
  }

  function confirmUnlock(milestoneId: string) {
    if (!studentId) return;
    const note = noteDraft.trim();
    if (!note) {
      setMessage(
        "Add a short specific note so parents know what actually happened.",
      );
      return;
    }

    setMessage(null);
    startTransition(async () => {
      const result = await toggleStudentMilestone({
        studentId,
        milestoneId,
        achieved: true,
        achievedDate: toDateInputValue(),
        note,
      });
      if (result.error) {
        setMessage(result.error);
        return;
      }
      setLocalUnlocked((prev) => {
        const without = prev.filter(
          (u) =>
            !(u.studentId === studentId && u.milestoneId === milestoneId),
        );
        return [...without, { studentId, milestoneId, note }];
      });
      setDraftingId(null);
      setNoteDraft("");
      setMessage("Leap unlocked with your note.");
    });
  }

  function removeUnlock(milestoneId: string) {
    if (!studentId) return;
    setMessage(null);
    startTransition(async () => {
      const result = await toggleStudentMilestone({
        studentId,
        milestoneId,
        achieved: false,
      });
      if (result.error) {
        setMessage(result.error);
        return;
      }
      setLocalUnlocked((prev) =>
        prev.filter(
          (u) =>
            !(u.studentId === studentId && u.milestoneId === milestoneId),
        ),
      );
      if (draftingId === milestoneId) cancelDraft();
      setMessage("Leap removed.");
    });
  }

  function onCreateLeap() {
    const name = newName.trim();
    if (!name) {
      setMessage("Give the leap a short name.");
      return;
    }
    const category =
      customCategory.trim() || newCategory.trim() || DEFAULT_LEAP_CATEGORY;

    setMessage(null);
    startTransition(async () => {
      const result = await createMilestone({
        name,
        category,
        icon: newIcon,
      });
      if (result.error && !result.milestone) {
        setMessage(result.error);
        return;
      }
      const created = result.milestone!;
      setMilestones((prev) => {
        if (prev.some((m) => m.id === created.id)) return prev;
        return [...prev, created];
      });
      setCreating(false);
      setNewName("");
      setCustomCategory("");
      setNewCategory(DEFAULT_LEAP_CATEGORY);
      setNewIcon(LEAP_ICONS[0]);
      setMessage(
        result.error
          ? "That leap was already in the library — pick it below to unlock."
          : `“${created.name}” added to the leap library.`,
      );
      // Ready to unlock for the selected child when one exists
      if (studentId) beginUnlock(created.id);
    });
  }

  return (
    <div className="space-y-5">
      {students.length > 0 ? (
        <label className="block max-w-md">
          <span className="mb-1 block text-sm font-bold text-forest">Child</span>
          <select
            value={studentId}
            onChange={(e) => {
              setStudentId(e.target.value);
              cancelDraft();
            }}
            className="input-field"
          >
            {students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
      ) : (
        <p className="rounded-2xl border-2 border-dashed border-forest/40 bg-mint/40 px-4 py-3 text-sm text-ink-soft">
          Add a student first to unlock leaps for them — you can still create
          leap types below.
        </p>
      )}

      {students.length > 0 ? (
        <p className="rounded-2xl border-2 border-dashed border-forest/40 bg-mint/40 px-4 py-3 text-sm text-ink-soft">
          When you unlock a leap, add{" "}
          <span className="font-bold text-forest">one specific line</span> about
          what happened — parents see this on the leap card (e.g. “Named 5
          different leaves”).
        </p>
      ) : null}

      {!creating ? (
        <button
          type="button"
          onClick={() => {
            setCreating(true);
            cancelDraft();
            setMessage(null);
          }}
          className="btn-secondary !py-2.5 text-sm"
        >
          + Create leap
        </button>
      ) : (
        <div className="surface-card space-y-3 border-yellow bg-pastel-yellow/40 p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-display text-xl font-bold text-forest">
              New leap type
            </h2>
            <button
              type="button"
              onClick={() => {
                setCreating(false);
                setNewName("");
                setCustomCategory("");
              }}
              className="text-xs font-bold text-forest-soft"
            >
              Cancel
            </button>
          </div>
          <p className="text-sm text-ink-soft">
            Saved to the shared library — available for every child after this.
          </p>

          <label className="block">
            <span className="mb-1 block text-sm font-bold text-forest">
              Name
            </span>
            <input
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. Dancing, Writing letters"
              className="input-field"
              maxLength={60}
            />
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-sm font-bold text-forest">
                Category
              </span>
              <select
                value={newCategory}
                onChange={(e) => {
                  setNewCategory(e.target.value);
                  setCustomCategory("");
                }}
                className="input-field"
              >
                {categoryOptions.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-bold text-forest">
                Or type a new category
              </span>
              <input
                value={customCategory}
                onChange={(e) => setCustomCategory(e.target.value)}
                placeholder="Optional — overrides the menu"
                className="input-field"
                maxLength={40}
              />
            </label>
          </div>

          <div>
            <span className="mb-1.5 block text-sm font-bold text-forest">
              Icon
            </span>
            <div className="flex flex-wrap gap-2">
              {LEAP_ICONS.map((icon) => (
                <button
                  key={icon}
                  type="button"
                  onClick={() => setNewIcon(icon)}
                  className={`flex h-10 w-10 items-center justify-center rounded-full border-2 text-xl transition ${
                    newIcon === icon
                      ? "border-forest bg-yellow shadow-[2px_2px_0_var(--forest)]"
                      : "border-forest/30 bg-cream"
                  }`}
                  aria-label={`Choose ${icon}`}
                >
                  {icon}
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            disabled={pending || !newName.trim()}
            onClick={onCreateLeap}
            className="btn-primary w-full !py-2.5 disabled:opacity-50"
          >
            {pending
              ? "Saving…"
              : studentId
                ? "Save leap"
                : "Save leap type"}
          </button>
        </div>
      )}

      {message && (
        <p className="rounded-2xl border-2 border-forest bg-mint px-4 py-3 text-sm font-semibold text-forest">
          {message}
        </p>
      )}

      {milestones.length === 0 && !creating ? (
        <div className="surface-card p-6 text-ink-soft">
          No leap types yet. Tap{" "}
          <span className="font-bold text-forest">Create leap</span> to add the
          first one.
        </div>
      ) : null}

      <div className="space-y-8">
        {byCategory.map(([category, items]) => (
          <section key={category}>
            <h2 className="font-display text-xl font-bold text-forest">
              {category}
            </h2>
            <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((m) => {
                const unlockedRow = unlockedByMilestone.get(m.id);
                const on = Boolean(unlockedRow);
                const drafting = draftingId === m.id;

                return (
                  <li key={m.id} className="surface-card overflow-hidden p-0">
                    <div
                      className={`flex w-full items-center gap-3 p-4 text-left ${
                        on ? "bg-pastel-yellow" : "bg-card"
                      }`}
                    >
                      <span className="text-2xl" aria-hidden>
                        {m.icon}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block font-display font-bold text-forest">
                          {m.name}
                        </span>
                        {on && unlockedRow?.note ? (
                          <span className="mt-0.5 block text-xs font-semibold leading-snug text-forest-soft">
                            “{unlockedRow.note}”
                          </span>
                        ) : (
                          <span className="text-xs font-semibold text-forest-soft">
                            {on ? "Unlocked" : "Not yet"}
                          </span>
                        )}
                      </span>
                    </div>

                    {drafting ? (
                      <div className="space-y-2 border-t-2 border-dashed border-forest/30 bg-pastel-yellow/50 p-3">
                        <label className="block">
                          <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-forest">
                            What happened? (required)
                          </span>
                          <input
                            autoFocus
                            value={noteDraft}
                            onChange={(e) => setNoteDraft(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") confirmUnlock(m.id);
                              if (e.key === "Escape") cancelDraft();
                            }}
                            placeholder="e.g. Followed the trail without holding hands"
                            className="input-field !border-2 !border-forest !bg-cream !py-2.5 text-sm"
                            maxLength={120}
                          />
                        </label>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            disabled={pending || !noteDraft.trim()}
                            onClick={() => confirmUnlock(m.id)}
                            className="btn-primary flex-1 !py-2 text-sm disabled:opacity-50"
                          >
                            Unlock leap
                          </button>
                          <button
                            type="button"
                            disabled={pending}
                            onClick={cancelDraft}
                            className="rounded-full border-2 border-forest bg-cream px-3 py-2 text-sm font-bold text-forest"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex gap-2 border-t border-forest/15 px-3 py-2">
                        {on ? (
                          <button
                            type="button"
                            disabled={pending || !studentId}
                            onClick={() => removeUnlock(m.id)}
                            className="w-full rounded-full border-2 border-forest/40 bg-cream px-3 py-1.5 text-xs font-bold text-forest-soft disabled:opacity-60"
                          >
                            Remove leap
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled={pending || !studentId}
                            onClick={() => beginUnlock(m.id)}
                            className="w-full rounded-full border-2 border-forest bg-yellow px-3 py-1.5 text-xs font-bold text-forest disabled:opacity-60"
                          >
                            Unlock + add note
                          </button>
                        )}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
