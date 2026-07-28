import {
  MAX_UPLOAD_BYTES,
  PROXY_UPLOAD_BYTES,
  resolveUploadContentType,
} from "@/lib/media-types";

export type UploadPurpose = "session" | "portrait";

export type UploadResult = {
  url: string;
  mediaId?: string;
  kind: "image" | "video";
};

async function readJsonSafe(res: Response): Promise<{
  error?: string;
  [key: string]: unknown;
}> {
  const text = await res.text();
  if (!text) {
    return {
      error:
        res.status === 413
          ? "That file is too large for this connection. Try a smaller photo or a short clip."
          : `Upload failed (${res.status}).`,
    };
  }
  try {
    return JSON.parse(text) as { error?: string };
  } catch {
    // Safari: response.json() on HTML/plain text → "The string did not match the expected pattern."
    if (res.status === 413) {
      return {
        error:
          "That file is too large for this connection. Try a smaller photo or a short clip.",
      };
    }
    return {
      error: `Upload failed (${res.status}). Please try again with a smaller file.`,
    };
  }
}

function isLikelyCorsFailure(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return (
    message.includes("Failed to fetch") ||
    message.includes("NetworkError") ||
    message.includes("Load failed") ||
    message.includes("CORS")
  );
}

/**
 * Shrink phone photos so they fit under Vercel’s proxy limit when direct S3
 * isn’t available (CORS not ready, etc.). Videos are left unchanged.
 */
async function compressImageForProxy(file: File): Promise<File | null> {
  if (!file.type.startsWith("image/") && !/\.(jpe?g|png|webp|heic|heif)$/i.test(file.name)) {
    return null;
  }
  // HEIC often can’t be decoded in-browser — skip and let caller handle
  if (
    file.type.includes("heic") ||
    file.type.includes("heif") ||
    /\.heic$/i.test(file.name) ||
    /\.heif$/i.test(file.name)
  ) {
    return null;
  }

  try {
    const bitmap = await createImageBitmap(file);
    const maxEdge = 1920;
    const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      bitmap.close();
      return null;
    }
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    for (const quality of [0.82, 0.7, 0.55]) {
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/jpeg", quality),
      );
      if (!blob) continue;
      if (blob.size <= PROXY_UPLOAD_BYTES) {
        const base = (file.name || "photo").replace(/\.[^.]+$/, "") || "photo";
        return new File([blob], `${base}.jpg`, { type: "image/jpeg" });
      }
    }
    return null;
  } catch {
    return null;
  }
}

async function uploadViaProxy(
  file: File,
  purpose: UploadPurpose,
  contentType: string,
): Promise<UploadResult> {
  const body = new FormData();
  const named = new File([file], file.name || "upload.jpg", {
    type: contentType,
  });
  body.append("file", named);
  body.append("purpose", purpose);

  const res = await fetch("/api/upload", { method: "POST", body });
  const data = await readJsonSafe(res);
  if (!res.ok || !data.url) {
    throw new Error(
      typeof data.error === "string" ? data.error : "Upload failed",
    );
  }
  return {
    url: String(data.url),
    mediaId: data.mediaId ? String(data.mediaId) : undefined,
    kind: data.kind === "video" ? "video" : "image",
  };
}

async function uploadViaPresign(
  file: File,
  purpose: UploadPurpose,
  contentType: string,
): Promise<UploadResult> {
  const presignRes = await fetch("/api/upload/presign", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      filename: file.name || "upload.jpg",
      contentType,
      size: file.size,
      purpose,
    }),
  });
  const presign = await readJsonSafe(presignRes);
  if (!presignRes.ok || !presign.uploadUrl || !presign.key) {
    throw new Error(
      typeof presign.error === "string"
        ? presign.error
        : "Could not start upload",
    );
  }

  const putRes = await fetch(String(presign.uploadUrl), {
    method: "PUT",
    headers: { "Content-Type": contentType },
    body: file,
  });

  if (!putRes.ok) {
    throw new Error(
      putRes.status === 403
        ? "Upload blocked by storage permissions (HTTP 403)."
        : `Storage upload failed (${putRes.status}).`,
    );
  }

  const completeRes = await fetch("/api/upload/complete", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      key: presign.key,
      contentType,
      filename: file.name || "upload.jpg",
      purpose,
    }),
  });
  const complete = await readJsonSafe(completeRes);
  if (!completeRes.ok || !complete.url) {
    throw new Error(
      typeof complete.error === "string"
        ? complete.error
        : "Could not finish upload",
    );
  }

  return {
    url: String(complete.url),
    mediaId: complete.mediaId ? String(complete.mediaId) : undefined,
    kind: complete.kind === "video" ? "video" : "image",
  };
}

/**
 * Upload a photo/video from the teacher phone/browser.
 * Prefers direct-to-S3; falls back to compressed proxy upload for photos.
 */
export async function uploadMediaFile(
  file: File,
  purpose: UploadPurpose = "session",
): Promise<UploadResult> {
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error("That file is a bit large — keep it under 25MB.");
  }

  let working = file;
  let contentType = resolveUploadContentType(working.name, working.type);
  if (!contentType) {
    throw new Error(
      "Please upload a photo or short video (jpg, png, webp, heic, mp4, mov).",
    );
  }

  if (purpose === "portrait" && !contentType.startsWith("image/")) {
    throw new Error("Portrait must be a photo (jpg, png, webp, or heic).");
  }

  const tryProxy = async () => {
    if (working.size > PROXY_UPLOAD_BYTES) {
      const compressed = await compressImageForProxy(working);
      if (!compressed) {
        throw new Error(
          "That photo is too large to upload right now. Try a smaller photo, or wait a minute and retry.",
        );
      }
      working = compressed;
      contentType = "image/jpeg";
    }
    return uploadViaProxy(working, purpose, contentType!);
  };

  // Small files: proxy first (no CORS needed)
  if (working.size <= PROXY_UPLOAD_BYTES) {
    try {
      return await uploadViaProxy(working, purpose, contentType);
    } catch {
      return await uploadViaPresign(working, purpose, contentType);
    }
  }

  // Large files: direct S3, then compress+proxy for photos
  try {
    return await uploadViaPresign(working, purpose, contentType);
  } catch (error) {
    if (contentType.startsWith("image/") || isLikelyCorsFailure(error)) {
      try {
        return await tryProxy();
      } catch {
        /* fall through */
      }
    }
    if (isLikelyCorsFailure(error)) {
      throw new Error(
        "Could not upload from this phone. Try again in a moment, or use a smaller photo.",
      );
    }
    throw error instanceof Error ? error : new Error("Upload failed");
  }
}
