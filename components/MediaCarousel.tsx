"use client";

import { useCallback, useEffect, useState } from "react";

type Slide = {
  id: string;
  url: string;
  caption: string | null;
  isVideo: boolean;
};

const mediaFrame =
  "flex aspect-[16/10] max-h-[420px] w-full items-center justify-center overflow-hidden rounded-xl bg-cream";
const mediaContain =
  "max-h-full max-w-full object-contain";

export function MediaCarousel({
  slides,
  altFallback,
}: {
  slides: Slide[];
  altFallback: string;
}) {
  const [index, setIndex] = useState(0);
  const total = slides.length;
  const current = slides[index];

  const go = useCallback(
    (dir: -1 | 1) => {
      setIndex((i) => (i + dir + total) % total);
    },
    [total],
  );

  useEffect(() => {
    if (total <= 1) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") go(-1);
      if (e.key === "ArrowRight") go(1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, total]);

  if (!current) return null;

  const media = current.isVideo ? (
    <video
      key={current.id}
      src={current.url}
      controls
      playsInline
      className={mediaContain}
    />
  ) : (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      key={current.id}
      src={current.url}
      alt={current.caption ?? altFallback}
      className={`${mediaContain} transition duration-300`}
      loading="lazy"
    />
  );

  if (total === 1) {
    return (
      <figure className="photo-frame photo-enter bg-card p-2 shadow-[var(--shadow-card)]">
        <div className={mediaFrame}>{media}</div>
        {current.caption && (
          <figcaption className="px-2 py-2 text-center text-sm font-medium text-ink-soft">
            {current.caption}
          </figcaption>
        )}
      </figure>
    );
  }

  return (
    <div className="relative">
      <div
        className="pointer-events-none absolute -inset-3 rounded-[2rem] bg-mint/70 sm:-inset-4"
        aria-hidden
      />
      <figure className="photo-frame relative bg-card p-2 shadow-[var(--shadow-card)]">
        <div className="relative overflow-hidden rounded-xl">
          <div className={mediaFrame}>{media}</div>

          <div
            className="pointer-events-none absolute inset-y-0 left-0 w-20 bg-gradient-to-r from-black/45 to-transparent"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute inset-y-0 right-0 w-20 bg-gradient-to-l from-black/45 to-transparent"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/50 to-transparent"
            aria-hidden
          />

          <button
            type="button"
            onClick={() => go(-1)}
            className="absolute left-2 top-1/2 z-10 -translate-y-1/2 rounded-full border-2 border-forest bg-yellow/95 px-2.5 py-1.5 text-sm font-bold text-forest shadow-[0_2px_8px_rgba(0,0,0,0.35)]"
            aria-label="Previous photo"
          >
            ←
          </button>
          <button
            type="button"
            onClick={() => go(1)}
            className="absolute right-2 top-1/2 z-10 -translate-y-1/2 rounded-full border-2 border-forest bg-yellow/95 px-2.5 py-1.5 text-sm font-bold text-forest shadow-[0_2px_8px_rgba(0,0,0,0.35)]"
            aria-label="Next photo"
          >
            →
          </button>

          <span className="absolute bottom-2 right-2 z-10 rounded-full border-2 border-forest bg-cream/95 px-2.5 py-0.5 text-xs font-bold text-forest shadow-[0_2px_8px_rgba(0,0,0,0.3)]">
            {index + 1} / {total}
          </span>
        </div>

        {current.caption && (
          <figcaption className="px-2 py-2 text-center text-sm font-medium text-ink-soft">
            {current.caption}
          </figcaption>
        )}

        <div className="flex justify-center gap-1.5 pb-2 pt-1">
          {slides.map((slide, i) => (
            <button
              key={slide.id}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={`Go to photo ${i + 1}`}
              className={`h-2.5 w-2.5 rounded-full border-2 border-forest transition ${
                i === index ? "bg-yellow" : "bg-cream"
              }`}
            />
          ))}
        </div>
      </figure>
    </div>
  );
}
