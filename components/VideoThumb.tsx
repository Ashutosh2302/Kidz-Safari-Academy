"use client";

import { useCallback, useRef } from "react";

/** iOS Safari often shows a blank frame until play — media fragment forces the first frame. */
export function videoPosterSrc(url: string) {
  if (!url || url.includes("#")) return url;
  return `${url}#t=0.001`;
}

type Props = {
  src: string;
  /** Size/layout classes for the outer frame (e.g. aspect-square w-full). */
  className?: string;
  /** Show a play glyph over the poster. */
  showPlayBadge?: boolean;
};

/**
 * Thumbnail/preview for videos in grids (Session builder, history, etc.).
 * Handles iOS blank-poster quirk and paints a real first frame when possible.
 */
export function VideoThumb({
  src,
  className = "aspect-square w-full",
  showPlayBadge = true,
}: Props) {
  const ref = useRef<HTMLVideoElement | null>(null);

  const seekToPoster = useCallback(() => {
    const video = ref.current;
    if (!video) return;
    try {
      if (video.currentTime < 0.05) {
        video.currentTime = 0.001;
      }
    } catch {
      /* some codecs reject seeks before enough data */
    }
  }, []);

  return (
    <span
      className={`relative block overflow-hidden bg-forest/20 ${className}`.trim()}
    >
      <video
        ref={ref}
        src={videoPosterSrc(src)}
        className="absolute inset-0 h-full w-full object-cover"
        muted
        playsInline
        preload="metadata"
        onLoadedMetadata={seekToPoster}
        onLoadedData={seekToPoster}
      />
      {showPlayBadge ? (
        <span
          className="pointer-events-none absolute inset-0 flex items-center justify-center"
          aria-hidden
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-forest bg-cream/90 text-sm font-bold text-forest shadow-[2px_2px_0_rgba(0,0,0,0.15)]">
            ▶
          </span>
        </span>
      ) : null}
    </span>
  );
}
