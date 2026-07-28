"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ChildAvatar } from "@/components/ChildAvatar";
import {
  defaultPortraitCrop,
  exportPortraitBlob,
  loadImageFromFile,
  portraitSourceRect,
  type PortraitCrop,
} from "@/lib/portrait-crop";
import { uploadMediaFile } from "@/lib/upload-client";

type Props = {
  name?: string;
  initialUrl?: string | null;
  studentName?: string;
};

export function PortraitPhotoField({
  name = "photoUrl",
  initialUrl = null,
  studentName = "Child",
}: Props) {
  const inputId = useId();
  const fileRef = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState(initialUrl ?? "");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [draftFile, setDraftFile] = useState<File | null>(null);
  const [draftImg, setDraftImg] = useState<HTMLImageElement | null>(null);
  const [crop, setCrop] = useState<PortraitCrop>(defaultPortraitCrop);

  useEffect(() => {
    if (!draftFile) {
      setDraftImg(null);
      return;
    }
    let cancelled = false;
    loadImageFromFile(draftFile)
      .then((img) => {
        if (cancelled) return;
        setDraftImg(img);
        setCrop(defaultPortraitCrop());
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Could not read that photo.");
          setDraftFile(null);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [draftFile]);

  function onFileChange(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    setError(null);
    setDraftFile(file);
    if (fileRef.current) fileRef.current.value = "";
  }

  function cancelCrop() {
    setDraftFile(null);
    setDraftImg(null);
  }

  async function confirmCrop() {
    if (!draftImg || !draftFile) return;
    setUploading(true);
    setError(null);

    try {
      const blob = await exportPortraitBlob(draftImg, crop);
      const file = new File([blob], "portrait.jpg", { type: "image/jpeg" });
      const data = await uploadMediaFile(file, "portrait");
      setUrl(data.url);
      cancelCrop();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-2">
      <span className="mb-1 block text-sm font-bold text-forest">
        Portrait photo{" "}
        <span className="font-medium text-ink-soft">(optional)</span>
      </span>
      <p className="text-xs text-ink-soft">
        Shown as the child&apos;s avatar on the parent page — separate from
        class activity photos.
      </p>

      <input type="hidden" name={name} value={url} />

      <div className="flex flex-wrap items-center gap-4">
        <ChildAvatar name={studentName} photoUrl={url || null} size="lg" />
        <div className="flex flex-wrap gap-2">
          <label
            htmlFor={inputId}
            className={`btn-secondary !py-2 !text-sm ${
              uploading || draftFile
                ? "pointer-events-none opacity-60"
                : "cursor-pointer"
            }`}
          >
            {uploading
              ? "Uploading…"
              : url
                ? "Change photo"
                : "Add photo"}
          </label>
          <input
            id={inputId}
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
            className="sr-only"
            disabled={uploading || Boolean(draftFile)}
            onChange={(e) => onFileChange(e.target.files)}
          />
          {url ? (
            <button
              type="button"
              className="rounded-full border-2 border-forest bg-cream px-3 py-2 text-sm font-bold text-forest"
              disabled={uploading || Boolean(draftFile)}
              onClick={() => {
                setUrl("");
                setError(null);
              }}
            >
              Remove
            </button>
          ) : null}
        </div>
      </div>

      {draftFile ? (
        <div className="rounded-2xl border-2 border-forest bg-mint/40 p-4">
          <p className="text-sm font-bold text-forest">
            Frame the face in the circle
          </p>
          <p className="mt-0.5 text-xs text-ink-soft">
            Drag the sliders until the face sits clearly in the preview.
          </p>

          <div className="mt-4 flex flex-col items-center gap-4 sm:flex-row sm:items-start">
            <PortraitCropPreview img={draftImg} crop={crop} />
            <div className="w-full max-w-xs flex-1 space-y-4">
              <label className="block">
                <span className="mb-1 flex justify-between text-xs font-bold text-forest">
                  <span>Move up / down</span>
                </span>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={Math.round(crop.focusY * 100)}
                  onChange={(e) =>
                    setCrop((c) => ({
                      ...c,
                      focusY: Number(e.target.value) / 100,
                    }))
                  }
                  className="w-full accent-forest"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-bold text-forest">
                  Zoom
                </span>
                <input
                  type="range"
                  min={100}
                  max={280}
                  value={Math.round(crop.zoom * 100)}
                  onChange={(e) =>
                    setCrop((c) => ({
                      ...c,
                      zoom: Number(e.target.value) / 100,
                    }))
                  }
                  className="w-full accent-forest"
                />
              </label>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="btn-primary !py-2 !text-sm"
                  disabled={!draftImg || uploading}
                  onClick={confirmCrop}
                >
                  {uploading ? "Uploading…" : "Use this crop"}
                </button>
                <button
                  type="button"
                  className="rounded-full border-2 border-forest bg-cream px-3 py-2 text-sm font-bold text-forest"
                  disabled={uploading}
                  onClick={cancelCrop}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {error ? (
        <p className="text-sm font-medium text-red-deep" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function PortraitCropPreview({
  img,
  crop,
}: {
  img: HTMLImageElement | null;
  crop: PortraitCrop;
}) {
  const size = 160;

  if (!img) {
    return (
      <div
        className="shrink-0 rounded-full border-2 border-dashed border-forest bg-cream"
        style={{ width: size, height: size }}
      />
    );
  }

  const { sx, sy, side } = portraitSourceRect(
    img.naturalWidth,
    img.naturalHeight,
    crop,
  );
  const scale = size / side;

  return (
    <div
      className="relative shrink-0 overflow-hidden rounded-full border-2 border-yellow shadow-[2px_2px_0_rgba(0,0,0,0.15)]"
      style={{ width: size, height: size }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={img.src}
        alt=""
        draggable={false}
        className="pointer-events-none absolute max-w-none"
        style={{
          width: img.naturalWidth * scale,
          height: img.naturalHeight * scale,
          left: -sx * scale,
          top: -sy * scale,
        }}
      />
    </div>
  );
}
