"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { ShareUpdate } from "@/components/ShareUpdate";
import { startAmbientPad } from "@/lib/ambient-pad";
import { formatDisplayDate } from "@/lib/dates";
import {
  closingLineForRange,
  filterPhotosForRange,
  mediaCountLabel,
  RANGE_LABELS,
  SLIDE_DURATION_MS,
  VIDEO_MAX_MS,
  type MemoryLaneMedia,
  type MemoryLaneRange,
} from "@/lib/memory-lane";

type Phase = "closed" | "pick" | "play" | "end";

const RANGES: MemoryLaneRange[] = ["week", "month", "lifetime"];

export function MemoryLane({
  name,
  joinedOn,
  photos,
}: {
  name: string;
  joinedOn: string;
  /** Photos and videos from the child's sessions */
  photos: MemoryLaneMedia[];
}) {
  const titleId = useId();
  const [phase, setPhase] = useState<Phase>("closed");
  const [range, setRange] = useState<MemoryLaneRange>("week");
  const [index, setIndex] = useState(0);
  const [muted, setMuted] = useState(false);
  const [kenKey, setKenKey] = useState(0);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const stopPadRef = useRef<(() => void) | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  const slides = useMemo(
    () => filterPhotosForRange(photos, range, joinedOn),
    [photos, range, joinedOn],
  );

  const joinedLabel = formatDisplayDate(new Date(joinedOn));
  const closing = closingLineForRange(range, name, joinedLabel);
  const atEnd = phase === "end";
  const current = slides[index];

  function openPicker() {
    setPhase("pick");
    setRange("week");
    setIndex(0);
    setMuted(false);
  }

  function startPlayback(nextRange: MemoryLaneRange) {
    setRange(nextRange);
    setIndex(0);
    setKenKey((k) => k + 1);
    setPhase("play");
    void ensureSound();
  }

  function closeAll() {
    setPhase("closed");
    setIndex(0);
    teardownAudio();
  }

  function switchRange(next: MemoryLaneRange) {
    setRange(next);
    setIndex(0);
    setKenKey((k) => k + 1);
    setPhase("play");
    if (!muted) void ensureSound();
  }

  function goPrev() {
    if (phase === "end") {
      setPhase("play");
      setIndex(Math.max(0, slides.length - 1));
      setKenKey((k) => k + 1);
      return;
    }
    if (index <= 0) return;
    setIndex((i) => i - 1);
    setKenKey((k) => k + 1);
  }

  function goNext() {
    if (phase !== "play") return;
    if (index >= slides.length - 1) {
      setPhase("end");
      return;
    }
    setIndex((i) => i + 1);
    setKenKey((k) => k + 1);
  }

  function teardownAudio() {
    stopPadRef.current?.();
    stopPadRef.current = null;
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    void audioCtxRef.current?.suspend();
  }

  async function ensureSound() {
    const audio = audioRef.current;
    if (audio) {
      try {
        audio.loop = true;
        audio.volume = 0.35;
        await audio.play();
        return;
      } catch {
        /* fall through to pad */
      }
    }
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    if (!Ctx) return;
    if (!audioCtxRef.current) audioCtxRef.current = new Ctx();
    const ctx = audioCtxRef.current;
    if (ctx.state === "suspended") await ctx.resume();
    stopPadRef.current?.();
    stopPadRef.current = startAmbientPad(ctx);
  }

  async function toggleMute() {
    const next = !muted;
    setMuted(next);
    if (next) {
      teardownAudio();
    } else {
      await ensureSound();
    }
  }

  function advanceFromSlide() {
    if (index >= slides.length - 1) setPhase("end");
    else {
      setIndex((i) => i + 1);
      setKenKey((k) => k + 1);
    }
  }

  // Auto-advance — photos on a timer; videos play (muted) up to VIDEO_MAX_MS
  useEffect(() => {
    if (phase !== "play" || slides.length === 0) return;
    const slide = slides[index];
    if (!slide) return;

    if (!slide.isVideo) {
      const t = window.setTimeout(advanceFromSlide, SLIDE_DURATION_MS);
      return () => window.clearTimeout(t);
    }

    const video = videoRef.current;
    if (!video) {
      const t = window.setTimeout(advanceFromSlide, VIDEO_MAX_MS);
      return () => window.clearTimeout(t);
    }

    let cancelled = false;
    let capTimer: number | undefined;
    let endedHandler: (() => void) | undefined;

    const clear = () => {
      if (capTimer) window.clearTimeout(capTimer);
      if (endedHandler) video.removeEventListener("ended", endedHandler);
    };

    const arm = () => {
      if (cancelled) return;
      const durationMs = Number.isFinite(video.duration)
        ? video.duration * 1000
        : VIDEO_MAX_MS;
      const hold = Math.min(
        Math.max(durationMs, 800),
        VIDEO_MAX_MS,
      );
      capTimer = window.setTimeout(() => {
        video.pause();
        advanceFromSlide();
      }, hold);
      endedHandler = () => {
        if (capTimer) window.clearTimeout(capTimer);
        advanceFromSlide();
      };
      video.addEventListener("ended", endedHandler);
      video.currentTime = 0;
      void video.play().catch(() => {
        /* autoplay blocked — still advance on timer */
      });
    };

    if (video.readyState >= 1) arm();
    else {
      const onMeta = () => arm();
      video.addEventListener("loadedmetadata", onMeta, { once: true });
      return () => {
        cancelled = true;
        clear();
        video.removeEventListener("loadedmetadata", onMeta);
      };
    }

    return () => {
      cancelled = true;
      clear();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, index, slides, kenKey]);

  useEffect(() => {
    if (phase === "play" && slides.length === 0) setPhase("end");
  }, [phase, slides.length]);

  useEffect(() => {
    if (phase === "closed") return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeAll();
      if (e.key === "ArrowRight") goNext();
      if (e.key === "ArrowLeft") goPrev();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, index, slides.length]);

  useEffect(() => () => teardownAudio(), []);

  const progress =
    phase === "end"
      ? 100
      : slides.length === 0
        ? 0
        : ((index + 1) / (slides.length + 1)) * 100;

  return (
    <>
      <button
        type="button"
        onClick={openPicker}
        className="rounded-full border-2 border-forest bg-mint px-3 py-1.5 text-xs font-bold text-forest shadow-[2px_2px_0_var(--forest)] transition hover:-translate-y-0.5"
      >
        Relive the memories 🌻
      </button>

      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <audio ref={audioRef} src="/audio/music.mp3" preload="auto" loop />

      {phase !== "closed" && (
        <div
          className="fixed inset-0 z-[60] flex min-h-0 flex-col overflow-hidden bg-forest/95 text-cream"
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
        >
          <header className="flex shrink-0 flex-wrap items-center justify-between gap-2 px-4 py-3 sm:px-6">
            <div>
              <p
                id={titleId}
                className="font-display text-lg font-bold text-yellow sm:text-xl"
              >
                Memory Lane
              </p>
              <p className="text-xs font-semibold text-cream/70">
                {name}&apos;s little journey
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {(phase === "play" || phase === "end") && (
                <div className="flex gap-1 rounded-full border border-yellow/40 bg-forest/40 p-1">
                  {RANGES.map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => switchRange(r)}
                      className={`rounded-full px-2.5 py-1 text-[11px] font-bold transition ${
                        range === r
                          ? "bg-yellow text-forest"
                          : "text-yellow/80 hover:bg-yellow/15"
                      }`}
                    >
                      {RANGE_LABELS[r]}
                    </button>
                  ))}
                </div>
              )}
              {(phase === "play" || phase === "end") && (
                <button
                  type="button"
                  onClick={() => void toggleMute()}
                  className="rounded-full border-2 border-yellow/50 px-3 py-1 text-xs font-bold text-yellow"
                >
                  {muted ? "Unmute ♪" : "Mute ♪"}
                </button>
              )}
              <button
                type="button"
                onClick={closeAll}
                className="rounded-full border-2 border-yellow bg-yellow px-3 py-1 text-sm font-bold text-forest"
                aria-label="Close Memory Lane"
              >
                ✕
              </button>
            </div>
          </header>

          {(phase === "play" || phase === "end") && (
            <div className="mx-4 h-1 shrink-0 overflow-hidden rounded-full bg-cream/20 sm:mx-6">
              <div
                className="h-full rounded-full bg-yellow transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}

          {phase === "pick" && (
            <div className="flex flex-1 flex-col items-center justify-center gap-6 px-6">
              <div className="max-w-md text-center">
                <h2 className="font-display text-3xl font-bold text-yellow">
                  How far back shall we go?
                </h2>
                <p className="mt-2 text-sm text-cream/80">
                  Pick a window, then sit back for a gentle slideshow.
                </p>
              </div>
              <div className="flex flex-wrap justify-center gap-3">
                {RANGES.map((r) => {
                  const count = filterPhotosForRange(photos, r, joinedOn).length;
                  return (
                    <button
                      key={r}
                      type="button"
                      onClick={() => startPlayback(r)}
                      className="min-w-[9rem] rounded-2xl border-2 border-yellow bg-cream px-5 py-4 text-center shadow-[3px_3px_0_#E8C547] transition hover:-translate-y-0.5"
                    >
                      <span className="block font-display text-lg font-bold text-forest">
                        {RANGE_LABELS[r]}
                      </span>
                      <span className="mt-1 block text-xs font-semibold text-ink-soft">
                        {mediaCountLabel(count)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {phase === "play" && current && (
            <div className="flex min-h-0 flex-1 flex-col">
              {/*
                Stage fills remaining viewport under header/progress/controls.
                Cream letterbox + object-contain keeps portrait/landscape fully visible.
              */}
              <div
                className="relative mx-4 mt-3 flex min-h-0 w-auto max-w-5xl flex-1 items-center justify-center self-center overflow-hidden rounded-[1.5rem] border-4 border-yellow bg-cream sm:mx-6 sm:mt-4"
                style={{
                  width: "min(100%, 64rem)",
                  maxHeight: "calc(100dvh - 10.5rem)",
                }}
              >
                <div className="flex h-full w-full items-center justify-center p-2 sm:p-3">
                  {current.isVideo ? (
                    // eslint-disable-next-line jsx-a11y/media-has-caption
                    <video
                      key={kenKey}
                      ref={videoRef}
                      src={current.url}
                      muted
                      playsInline
                      className="h-auto max-h-full w-auto max-w-full object-contain"
                    />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={kenKey}
                      src={current.url}
                      alt=""
                      className={`memory-ken h-auto max-h-[96%] w-auto max-w-[96%] object-contain ${
                        kenKey % 2 === 0 ? "memory-ken-a" : "memory-ken-b"
                      }`}
                    />
                  )}
                </div>
                {current.sessionNote?.trim() ? (
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-forest/85 via-forest/35 to-transparent px-4 pb-4 pt-14 sm:px-5 sm:pb-5">
                    <p
                      key={`cap-${kenKey}`}
                      className="memory-caption font-display text-base font-semibold leading-snug text-cream sm:text-xl"
                    >
                      {current.sessionNote}
                    </p>
                  </div>
                ) : null}
              </div>

              <div className="flex shrink-0 items-center justify-between gap-3 px-4 py-3 sm:px-8 sm:py-4">
                <button
                  type="button"
                  onClick={goPrev}
                  disabled={index === 0}
                  className="rounded-full border-2 border-yellow/60 px-4 py-2 text-sm font-bold text-yellow disabled:opacity-30"
                >
                  ← Prev
                </button>
                <div className="flex max-w-[50%] flex-wrap justify-center gap-1.5">
                  {slides.map((s, i) => (
                    <button
                      key={s.id}
                      type="button"
                      aria-label={
                        s.isVideo ? `Video ${i + 1}` : `Photo ${i + 1}`
                      }
                      onClick={() => {
                        setIndex(i);
                        setKenKey((k) => k + 1);
                      }}
                      className={`h-2 w-2 rounded-full transition ${
                        i === index ? "scale-125 bg-yellow" : "bg-cream/40"
                      }`}
                    />
                  ))}
                </div>
                <button
                  type="button"
                  onClick={goNext}
                  className="rounded-full border-2 border-yellow bg-yellow px-4 py-2 text-sm font-bold text-forest"
                >
                  Next →
                </button>
              </div>
            </div>
          )}

          {atEnd && (
            <div className="flex flex-1 flex-col items-center justify-center gap-5 px-6 text-center">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-yellow/80">
                {RANGE_LABELS[range]}
              </p>
              <h2 className="font-display text-4xl font-bold text-yellow sm:text-5xl">
                {name}
              </h2>
              <p className="max-w-md font-display text-xl font-semibold text-cream sm:text-2xl">
                {closing}
              </p>
              {slides.length === 0 && (
                <p className="text-sm text-cream/70">
                  No moments in this window yet — try another range, or check
                  back after the next class.
                </p>
              )}
              <div className="flex flex-wrap items-center justify-center gap-3 [&_button]:!border-yellow [&_button]:!bg-yellow [&_button]:!text-forest">
                <ShareUpdate childName={name} milestone={null} />
              </div>
              <div className="mt-2 flex flex-wrap justify-center gap-2">
                {RANGES.map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => switchRange(r)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-bold ${
                      range === r
                        ? "border-yellow bg-yellow text-forest"
                        : "border-yellow/50 text-yellow"
                    }`}
                  >
                    Replay · {RANGE_LABELS[r]}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}
