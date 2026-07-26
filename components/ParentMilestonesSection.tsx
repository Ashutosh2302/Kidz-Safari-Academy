type Item = {
  id: string;
  achievedDate: Date;
  note: string | null;
  milestone: {
    name: string;
    category: string;
    icon: string;
  };
};

export function ParentMilestonesSection({
  name,
  items,
}: {
  name: string;
  items: Item[];
}) {
  if (items.length === 0) {
    return (
      <section className="surface-card p-5 sm:p-6">
        <h2 className="font-display text-2xl font-bold text-forest">
          Tiny leaps
        </h2>
        <p className="mt-1 text-[11px] font-bold uppercase tracking-[0.12em] text-forest-soft">
          0 leaps yet
        </p>
        <p className="mt-2 text-sm text-ink-soft">
          No leaps unlocked yet — every journey starts with tiny steps 🐾
        </p>
        <p className="mt-1 text-sm text-ink-soft">
          As {name} grows, specific moments will light up here.
        </p>
      </section>
    );
  }

  return (
    <section className="surface-card p-5 sm:p-6">
      <h2 className="font-display text-2xl font-bold text-forest">Tiny leaps</h2>
      <p className="mt-1 text-sm text-ink-soft">
        Skills {name} has unlocked since joining
      </p>
      <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item, index) => (
          <li
            key={item.id}
            className="animate-soft-pop flex items-start gap-3 rounded-2xl border-2 border-forest bg-pastel-yellow p-3"
            style={{ animationDelay: `${index * 60}ms` }}
          >
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 border-forest bg-card text-2xl">
              {item.milestone.icon}
            </span>
            <span className="min-w-0">
              <span className="block font-display font-bold text-forest">
                {item.milestone.name}
              </span>
              <span className="text-xs font-semibold text-forest-soft">
                {item.milestone.category}
              </span>
              {item.note?.trim() ? (
                <span className="mt-1 block text-sm leading-snug text-ink-soft">
                  {item.note.trim()}
                </span>
              ) : null}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
