/** Shared admin loading skeleton — shown instantly while a tab's RSC payload loads. */
export function AdminTabSkeleton({
  title = "Loading…",
  cards = 6,
}: {
  title?: string;
  cards?: number;
}) {
  return (
    <main className="mx-auto min-h-screen max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <div className="h-9 w-40 animate-pulse rounded-2xl bg-cream-deep" />
          <div className="h-4 w-64 max-w-full animate-pulse rounded-full bg-cream-deep/80" />
        </div>
        <div className="h-10 w-16 animate-pulse rounded-full bg-cream-deep" />
      </div>

      <div className="my-4 h-px bg-forest/15" />

      <div className="mb-5 space-y-3">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 animate-pulse rounded-xl bg-cream-deep" />
          <div className="space-y-1.5">
            <div className="h-3.5 w-40 animate-pulse rounded-full bg-cream-deep" />
            <div className="h-3 w-28 animate-pulse rounded-full bg-cream-deep/70" />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-8 w-24 animate-pulse rounded-full bg-cream-deep"
            />
          ))}
        </div>
      </div>

      <p className="mb-4 text-sm font-bold text-forest-soft" aria-live="polite">
        {title}
      </p>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: cards }).map((_, i) => (
          <div
            key={i}
            className="surface-card h-36 animate-pulse bg-cream-deep/50 p-4"
            style={{ animationDelay: `${i * 40}ms` }}
          >
            <div className="flex gap-3">
              <div className="h-12 w-12 rounded-full bg-cream-deep" />
              <div className="flex-1 space-y-2 pt-1">
                <div className="h-4 w-2/3 rounded-full bg-cream-deep" />
                <div className="h-3 w-1/2 rounded-full bg-cream-deep/70" />
              </div>
            </div>
            <div className="mt-4 space-y-2">
              <div className="h-3 w-full rounded-full bg-cream-deep/60" />
              <div className="h-3 w-4/5 rounded-full bg-cream-deep/40" />
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
