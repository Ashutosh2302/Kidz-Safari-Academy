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
          "That file is too large to upload through the server. Try a smaller photo, or ask to enable direct S3 uploads.",
      };
    }
    return {
      error: `Upload failed (${res.status}). Please try again with a smaller file.`,
    };
  }
}

async function uploadViaProxy(
  file: File,
  purpose: UploadPurpose,
  contentType: string,
): Promise<UploadResult> {
  const body = new FormData();
  // Ensure MIME is set — some phones send empty type
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
        ? "Upload blocked by storage permissions. Check S3/R2 CORS allows PUT from this site."
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
 * Uses direct-to-S3 when possible so large phone files bypass Vercel’s 4.5MB limit.
 */
export async function uploadMediaFile(
  file: File,
  purpose: UploadPurpose = "session",
): Promise<UploadResult> {
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error("That file is a bit large — keep it under 25MB.");
  }

  const contentType = resolveUploadContentType(file.name, file.type);
  if (!contentType) {
    throw new Error(
      "Please upload a photo or short video (jpg, png, webp, heic, mp4, mov).",
    );
  }

  if (purpose === "portrait" && !contentType.startsWith("image/")) {
    throw new Error("Portrait must be a photo (jpg, png, webp, or heic).");
  }

  // Prefer direct S3 for anything that might hit the serverless body limit
  if (file.size > PROXY_UPLOAD_BYTES) {
    try {
      return await uploadViaPresign(file, purpose, contentType);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Upload failed";
      // CORS misconfig is the usual failure mode — make it actionable
      if (
        message.includes("Failed to fetch") ||
        message.includes("NetworkError") ||
        message.includes("Load failed")
      ) {
        throw new Error(
          "Could not reach storage from this phone. Ask to enable S3/R2 CORS for this site (PUT), then try again.",
        );
      }
      throw error instanceof Error ? error : new Error(message);
    }
  }

  // Small files: try proxy first (works without CORS), then presign
  try {
    return await uploadViaProxy(file, purpose, contentType);
  } catch {
    return await uploadViaPresign(file, purpose, contentType);
  }
}
