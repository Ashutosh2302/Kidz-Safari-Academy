import { NextResponse } from "next/server";
import { isTeacherAuthed } from "@/lib/auth";
import {
  ALLOWED_UPLOAD_TYPES,
  MAX_UPLOAD_BYTES,
  resolveUploadContentType,
} from "@/lib/media-types";
import { createPresignedPutUrl } from "@/lib/s3";

export async function POST(request: Request) {
  if (!(await isTeacherAuthed())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as {
      filename?: string;
      contentType?: string;
      size?: number;
      purpose?: string;
    };

    const filename = String(body.filename ?? "upload.jpg");
    const purpose = String(body.purpose ?? "session");
    const isPortrait = purpose === "portrait";
    const size = Number(body.size ?? 0);

    if (!Number.isFinite(size) || size <= 0) {
      return NextResponse.json({ error: "Invalid file size." }, { status: 400 });
    }

    if (size > MAX_UPLOAD_BYTES) {
      return NextResponse.json(
        { error: "That file is a bit large — keep it under 25MB." },
        { status: 400 },
      );
    }

    const contentType = resolveUploadContentType(filename, body.contentType);
    if (!contentType || !ALLOWED_UPLOAD_TYPES.has(contentType)) {
      return NextResponse.json(
        {
          error:
            "Please upload a photo or short video (jpg, png, webp, heic, mp4, mov).",
        },
        { status: 400 },
      );
    }

    if (isPortrait && !contentType.startsWith("image/")) {
      return NextResponse.json(
        { error: "Portrait must be a photo (jpg, png, webp, or heic)." },
        { status: 400 },
      );
    }

    const { key, uploadUrl, publicUrl } = await createPresignedPutUrl({
      contentType,
      filename,
      folder: isPortrait ? "portraits" : "sessions",
    });

    return NextResponse.json({
      key,
      uploadUrl,
      publicUrl,
      contentType,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not start upload.";
    console.error("Presign error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
