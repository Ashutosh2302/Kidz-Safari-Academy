/** Export a square JPEG focused on the face area the teacher framed. */

export type PortraitCrop = {
  /** 0 = top of image, 1 = bottom */
  focusY: number;
  /** 1 = fit shortest side, higher = tighter */
  zoom: number;
};

export function defaultPortraitCrop(): PortraitCrop {
  // Prefer upper third — typical for full-body / standing photos
  return { focusY: 0.18, zoom: 1.35 };
}

export async function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Could not read that photo."));
    reader.readAsDataURL(file);
  });

  return new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error("Could not read that photo."));
    el.src = dataUrl;
  });
}

/** Source square (in image pixels) for the given crop settings. */
export function portraitSourceRect(
  naturalWidth: number,
  naturalHeight: number,
  crop: PortraitCrop,
) {
  const zoom = Math.min(3, Math.max(1, crop.zoom));
  const focusY = Math.min(1, Math.max(0, crop.focusY));
  const base = Math.min(naturalWidth, naturalHeight);
  const side = base / zoom;
  const maxX = Math.max(0, naturalWidth - side);
  const maxY = Math.max(0, naturalHeight - side);
  const sx = maxX / 2;
  const sy = focusY * maxY;
  return { sx, sy, side };
}

export async function exportPortraitBlob(
  img: HTMLImageElement,
  crop: PortraitCrop,
  outputSize = 512,
): Promise<Blob> {
  const { sx, sy, side } = portraitSourceRect(
    img.naturalWidth,
    img.naturalHeight,
    crop,
  );

  const canvas = document.createElement("canvas");
  canvas.width = outputSize;
  canvas.height = outputSize;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not prepare the portrait crop.");

  ctx.drawImage(img, sx, sy, side, side, 0, 0, outputSize, outputSize);

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob((b) => resolve(b), "image/jpeg", 0.9),
  );
  if (!blob) throw new Error("Could not prepare the portrait crop.");
  return blob;
}
