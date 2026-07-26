import Link from "next/link";
import { BrandLogo } from "@/components/BrandLogo";
import { DashDivider } from "@/components/DashDivider";

export default function ParentNotFound() {
  return (
    <main className="flex min-h-screen flex-col">
      <section className="hero-band flex flex-1 flex-col items-center justify-center px-6 py-20 text-center">
        <BrandLogo height={48} className="mb-6" />
        <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-yellow/90">
          Gentle Sprouts Academy · Kidz Safari
        </p>
        <h1 className="font-display text-4xl font-bold text-yellow sm:text-5xl">
          This link wandered off
        </h1>
        <p className="mt-4 max-w-md text-lg text-white/90">
          Ask your teacher for a fresh magic link — they&apos;re happy to send
          one.
        </p>
        <DashDivider className="w-48 border-yellow opacity-60" />
        <Link href="/" className="btn-secondary mt-2">
          Back home
        </Link>
      </section>
    </main>
  );
}
