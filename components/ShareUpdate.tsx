"use client";

import { useState } from "react";

type MilestoneShare = {
  name: string;
  category: string;
  icon: string;
  description: string;
} | null;

export function ShareUpdate({
  childName,
  milestone,
}: {
  childName: string;
  milestone: MilestoneShare;
}) {
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function pageUrl() {
    return typeof window !== "undefined" ? window.location.href : "";
  }

  function shareWhatsApp() {
    const url = pageUrl();
    const text = milestone
      ? `${childName} took a tiny leap this week: ${milestone.name} (${milestone.category}). Peek at the Gentle Sprouts Academy update: ${url}`
      : `Here's what ${childName} got up to at Gentle Sprouts Academy: ${url}`;
    window.open(
      `https://wa.me/?text=${encodeURIComponent(text)}`,
      "_blank",
      "noopener,noreferrer",
    );
  }

  async function exportMilestoneImage() {
    if (!milestone) {
      setMessage("No leap this week to export yet.");
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const canvas = document.createElement("canvas");
      const w = 1080;
      const h = 1080;
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas unavailable");

      // Cream background
      ctx.fillStyle = "#F7F1E3";
      ctx.fillRect(0, 0, w, h);

      // Forest frame
      ctx.strokeStyle = "#1F4D3A";
      ctx.lineWidth = 28;
      roundRect(ctx, 40, 40, w - 80, h - 80, 64);
      ctx.stroke();

      // Yellow accent band
      ctx.fillStyle = "#E8C547";
      roundRect(ctx, 90, 90, w - 180, 120, 40);
      ctx.fill();

      ctx.fillStyle = "#1F4D3A";
      ctx.font = "bold 42px Fredoka, Nunito, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("Gentle Sprouts Academy", w / 2, 165);

      ctx.font = "120px serif";
      ctx.fillText(milestone.icon || "⭐", w / 2, 380);

      ctx.fillStyle = "#1F4D3A";
      ctx.font = "bold 72px Fredoka, Nunito, sans-serif";
      wrapCentered(ctx, milestone.name, w / 2, 480, w - 200, 80);

      ctx.fillStyle = "#4A6B5A";
      ctx.font = "36px Nunito, sans-serif";
      ctx.fillText(milestone.category, w / 2, 620);

      ctx.fillStyle = "#2C3A32";
      ctx.font = "40px Nunito, sans-serif";
      wrapCentered(ctx, milestone.description, w / 2, 700, w - 220, 52);

      ctx.fillStyle = "#1F4D3A";
      ctx.font = "bold 36px Fredoka, Nunito, sans-serif";
      ctx.fillText(`${childName} · Kidz Safari`, w / 2, 980);

      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/png"),
      );
      if (!blob) throw new Error("Could not create image");

      const file = new File(
        [blob],
        `${childName.toLowerCase()}-tiny-leap.png`,
        { type: "image/png" },
      );

      if (
        typeof navigator !== "undefined" &&
        navigator.canShare?.({ files: [file] })
      ) {
        await navigator.share({
          files: [file],
          title: `${childName}'s tiny leap`,
          text: milestone.description,
        });
        setMessage("Shared!");
      } else {
        const href = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = href;
        a.download = file.name;
        a.click();
        URL.revokeObjectURL(href);
        setMessage("Image saved — share it anywhere you like.");
      }
    } catch {
      setMessage("Couldn’t export the image. Try WhatsApp share instead.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={shareWhatsApp}
        className="rounded-full border-2 border-forest bg-yellow px-3 py-1.5 text-xs font-bold text-forest shadow-[2px_2px_0_var(--forest)] transition hover:-translate-y-0.5"
      >
        Share this update
      </button>
     
      {message && (
        <span className="text-xs font-semibold text-forest-soft">{message}</span>
      )}
    </div>
  );
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function wrapCentered(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
) {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  const startY = y - ((lines.length - 1) * lineHeight) / 2;
  lines.forEach((l, i) => {
    ctx.fillText(l, x, startY + i * lineHeight);
  });
}
