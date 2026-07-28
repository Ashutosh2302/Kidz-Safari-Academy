import { NextResponse } from "next/server";
import { isTeacherAuthed } from "@/lib/auth";
import {
  ALLOWED_UPLOAD_TYPES,
  mediaKindFromContentType,
  resolveUploadContentType,
} from "@/lib/media-types";
import { getPublicUrl, isManagedUploadKey } from "@/lib/s3";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  if (!(await isTeacherAuthed())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as {
      key?: string;
      contentType?: string;
      filename?: string;
      purpose?: string;
    };

    const key = String(body.key ?? "");
    const purpose = String(body.purpose ?? "session");
    const isPortrait = purpose === "portrait";
    const folder = isPortrait ? "portraits" : "sessions";

    if (!isManagedUploadKey(key, folder)) {
      return NextResponse.json({ error: "Invalid upload key." }, { status: 400 });
    }

    const filename = String(body.filename ?? "upload.jpg");
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

    const url = getPublicUrl(key);

    if (isPortrait) {
      return NextResponse.json({ url, kind: "image" as const });
    }

    const asset = await prisma.mediaAsset.create({
      data: {
        url,
        contentType,
        kind: mediaKindFromContentType(contentType),
        originalName: filename || null,
      },
    });

    return NextResponse.json({
      url,
      mediaId: asset.id,
      kind: asset.kind,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not finish upload.";
    console.error("Upload complete error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
