import { NextResponse } from "next/server";
import { isTeacherAuthed } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { uploadToS3 } from "@/lib/s3";

const MAX_BYTES = 25 * 1024 * 1024;
const ALLOWED = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
  "video/mp4",
  "video/quicktime",
]);

export async function POST(request: Request) {
  if (!(await isTeacherAuthed())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const purpose = String(formData.get("purpose") ?? "session");
    const isPortrait = purpose === "portrait";

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (isPortrait && !file.type.startsWith("image/")) {
      return NextResponse.json(
        { error: "Portrait must be a photo (jpg, png, or webp)." },
        { status: 400 },
      );
    }

    if (!ALLOWED.has(file.type)) {
      return NextResponse.json(
        { error: "Please upload a photo or short video (jpg, png, webp, mp4)." },
        { status: 400 },
      );
    }

    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { error: "That file is a bit large — keep it under 25MB." },
        { status: 400 },
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const { url } = await uploadToS3({
      file: buffer,
      contentType: file.type,
      filename: file.name || "upload.jpg",
      folder: isPortrait ? "portraits" : "sessions",
    });

    // Portraits are stored only on the student record — don't pollute media studio
    if (isPortrait) {
      return NextResponse.json({ url, kind: "image" });
    }

    const kind = file.type.startsWith("video/") ? "video" : "image";
    const asset = await prisma.mediaAsset.create({
      data: {
        url,
        contentType: file.type,
        kind,
        originalName: file.name || null,
      },
    });

    return NextResponse.json({
      url,
      mediaId: asset.id,
      kind: asset.kind,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Upload failed unexpectedly.";
    console.error("Upload error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
