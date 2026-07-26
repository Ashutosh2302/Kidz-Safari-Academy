import Link from "next/link";
import { BrandLogo } from "@/components/BrandLogo";
import { DashDivider } from "@/components/DashDivider";

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col px-5 py-10">
      <header className="mb-2 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <BrandLogo height={52} />
          <div>
            <p className="font-display text-lg font-bold tracking-tight text-forest sm:text-xl">
              Gentle Sprouts Academy
            </p>
            <p className="text-xs font-semibold text-forest-soft">
              at Kidz Safari
            </p>
          </div>
        </div>
        <Link href="/admin" className="pill-yellow shrink-0">
          Teacher
        </Link>
      </header>

      <DashDivider />

      <section className="animate-fade-up mt-4">
        <span className="pill-green">Ages 2 to 6</span>

        <h1 className="mt-5 font-display text-4xl font-bold leading-[1.15] text-forest sm:text-5xl">
          Where little explorers take their{" "}
          <span className="marker">first big leaps</span>
        </h1>

        <p className="mt-4 text-base leading-relaxed text-ink-soft">
          A warm window into evening class at Kidz Safari — songs, stories, and
          muddy fingers, shared with parents after every session.
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link href="/admin" className="btn-primary">
            Open teacher desk
          </Link>
          <span className="btn-secondary pointer-events-none opacity-90">
            Parents use magic link
          </span>
        </div>
      </section>

      <DashDivider className="mt-10" />

      <p className="text-center text-sm font-medium text-ink-muted">
        Parents: open the WhatsApp link your teacher sent.
      </p>
    </main>
  );
}
