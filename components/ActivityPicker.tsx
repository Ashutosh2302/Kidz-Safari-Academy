"use client";

import { useState, useTransition } from "react";
import { createActivity } from "@/app/actions/activities";

export type ActivityOption = { id: string; name: string };

export function ActivityPicker({
  activities,
  value,
  onChange,
  onActivitiesChange,
}: {
  activities: ActivityOption[];
  /** Empty string = no activity */
  value: string;
  onChange: (name: string) => void;
  onActivitiesChange?: (next: ActivityOption[]) => void;
}) {
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSelectChange(next: string) {
    if (next === "__create__") {
      setCreating(true);
      setError(null);
      return;
    }
    onChange(next);
  }

  function onCreate() {
    setError(null);
    startTransition(async () => {
      const result = await createActivity(newName);
      if (result.error) {
        setError(result.error);
        return;
      }
      if (!("success" in result) || !result.success) return;
      const activity = result.activity;
      const next = [...activities];
      if (!next.some((a) => a.id === activity.id)) {
        next.push(activity);
        next.sort((a, b) => a.name.localeCompare(b.name));
        onActivitiesChange?.(next);
      }
      onChange(activity.name);
      setNewName("");
      setCreating(false);
    });
  }

  return (
    <div className="space-y-2">
      <label className="block">
        <span className="mb-1 block text-sm font-bold text-forest">
          Activity{" "}
          <span className="font-semibold text-forest-soft">(optional)</span>
        </span>
        <select
          value={creating ? "__create__" : value}
          onChange={(e) => onSelectChange(e.target.value)}
          className="input-field"
        >
          <option value="">No activity</option>
          {activities.map((a) => (
            <option key={a.id} value={a.name}>
              {a.name}
            </option>
          ))}
          <option value="__create__">+ Create new activity…</option>
        </select>
      </label>

      {creating ? (
        <div className="rounded-2xl border-2 border-forest/20 bg-mint/40 p-3">
          <label className="block">
            <span className="mb-1 block text-xs font-bold text-forest">
              New activity name
            </span>
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  onCreate();
                }
              }}
              className="input-field"
              placeholder="e.g. Nature walk"
              autoFocus
            />
          </label>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={pending || !newName.trim()}
              onClick={onCreate}
              className="btn-secondary !px-3 !py-1.5 text-sm disabled:opacity-60"
            >
              {pending ? "Saving…" : "Add activity"}
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => {
                setCreating(false);
                setNewName("");
                setError(null);
              }}
              className="rounded-full border-2 border-forest/30 bg-cream px-3 py-1.5 text-sm font-bold text-forest"
            >
              Cancel
            </button>
          </div>
          {error ? (
            <p className="mt-2 text-xs font-semibold text-red-deep">{error}</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
