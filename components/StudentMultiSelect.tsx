"use client";

type Student = { id: string; name: string };

export function StudentMultiSelect({
  students,
  selectedIds,
  onChange,
}: {
  students: Student[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}) {
  const allSelected =
    students.length > 0 && selectedIds.length === students.length;

  function toggle(id: string) {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((x) => x !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  }

  function toggleAll() {
    onChange(allSelected ? [] : students.map((s) => s.id));
  }

  return (
    <div className="rounded-2xl border-2 border-forest bg-cream p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-sm font-bold text-forest">
          Children ({selectedIds.length}/{students.length})
        </span>
        <button
          type="button"
          onClick={toggleAll}
          className="text-xs font-bold text-forest-soft underline"
        >
          {allSelected ? "Clear all" : "Select all"}
        </button>
      </div>
      <ul className="max-h-56 space-y-1 overflow-y-auto pr-1">
        {students.map((s) => {
          const on = selectedIds.includes(s.id);
          return (
            <li key={s.id}>
              <label
                className={`flex cursor-pointer items-center gap-2 rounded-xl px-2.5 py-2 text-sm font-semibold ${
                  on ? "bg-yellow text-forest" : "bg-white text-forest hover:bg-mint"
                }`}
              >
                <input
                  type="checkbox"
                  checked={on}
                  onChange={() => toggle(s.id)}
                  className="h-4 w-4 accent-[var(--forest)]"
                />
                {s.name}
              </label>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
