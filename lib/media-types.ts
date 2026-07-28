/** Shared media upload limits & MIME helpers (client + server). */

export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

/** Stay under Vercel’s ~4.5MB function body limit when proxying. */
export const PROXY_UPLOAD_BYTES = 4 * 1024 * 1024;

export const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]);

export const ALLOWED_VIDEO_TYPES = new Set([
  "video/mp4",
  "video/quicktime",
  "video/x-m4v",
]);

export const ALLOWED_UPLOAD_TYPES = new Set([
  ...ALLOWED_IMAGE_TYPES,
  ...ALLOWED_VIDEO_TYPES,
]);

const EXT_TO_MIME: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  heic: "image/heic",
  heif: "image/heif",
  mp4: "video/mp4",
  m4v: "video/x-m4v",
  mov: "video/quicktime",
};

export function extensionFromFilename(filename: string): string {
  const raw = filename.includes(".")
    ? (filename.split(".").pop() ?? "bin")
    : "bin";
  // Strip anything that isn't a safe extension character (iPhone names can be odd)
  const cleaned = raw.toLowerCase().replace(/[^a-z0-9]/g, "");
  return cleaned || "bin";
}

/** iPhones often send an empty File.type — infer from the filename. */
export function resolveUploadContentType(
  filename: string,
  declaredType: string | null | undefined,
): string | null {
  const declared = (declaredType ?? "").trim().toLowerCase();
  if (ALLOWED_UPLOAD_TYPES.has(declared)) return declared;

  // Some browsers report image/jpg
  if (declared === "image/jpg") return "image/jpeg";

  const ext = extensionFromFilename(filename);
  const inferred = EXT_TO_MIME[ext];
  if (inferred && ALLOWED_UPLOAD_TYPES.has(inferred)) return inferred;

  return null;
}

export function mediaKindFromContentType(
  contentType: string,
): "image" | "video" {
  return contentType.startsWith("video/") ? "video" : "image";
}
