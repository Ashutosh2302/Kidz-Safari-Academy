import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { nanoid } from "nanoid";
import { extensionFromFilename } from "@/lib/media-types";

function getS3Client() {
  const region = process.env.S3_REGION ?? process.env.AWS_REGION;
  const accessKeyId =
    process.env.AWS_ACCESS_KEY_ID ?? process.env.S3_ACCESS_KEY_ID;
  const secretAccessKey =
    process.env.AWS_SECRET_ACCESS_KEY ?? process.env.S3_SECRET_ACCESS_KEY;

  if (!region || !accessKeyId || !secretAccessKey) {
    throw new Error(
      "S3 is not configured. Set AWS_REGION (or S3_REGION), AWS_ACCESS_KEY_ID, and AWS_SECRET_ACCESS_KEY in .env, then restart the server.",
    );
  }

  return new S3Client({
    region,
    credentials: { accessKeyId, secretAccessKey },
    ...(process.env.S3_ENDPOINT
      ? { endpoint: process.env.S3_ENDPOINT, forcePathStyle: true }
      : {}),
  });
}

function getBucket() {
  const bucket = process.env.S3_BUCKET;
  if (!bucket) {
    throw new Error("S3_BUCKET is not set");
  }
  return bucket;
}

export function getPublicUrl(key: string) {
  const base = process.env.S3_PUBLIC_BASE_URL?.replace(/\/$/, "");
  if (!base) {
    throw new Error("S3_PUBLIC_BASE_URL is not set");
  }
  return `${base}/${key}`;
}

export function buildObjectKey(params: {
  filename: string;
  folder?: string;
}) {
  const ext = extensionFromFilename(params.filename);
  const folder = params.folder ?? "sessions";
  return `${folder}/${nanoid()}.${ext}`;
}

export async function uploadToS3(params: {
  file: Buffer;
  contentType: string;
  filename: string;
  folder?: string;
}) {
  const bucket = getBucket();
  const key = buildObjectKey({
    filename: params.filename,
    folder: params.folder,
  });

  const client = getS3Client();
  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: params.file,
      ContentType: params.contentType,
    }),
  );

  return { key, url: getPublicUrl(key) };
}

/** Browser uploads directly to S3 — avoids Vercel’s 4.5MB body limit. */
export async function createPresignedPutUrl(params: {
  contentType: string;
  filename: string;
  folder?: string;
  expiresInSeconds?: number;
}) {
  const bucket = getBucket();
  const key = buildObjectKey({
    filename: params.filename,
    folder: params.folder,
  });

  const client = getS3Client();
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: params.contentType,
  });

  const uploadUrl = await getSignedUrl(client, command, {
    expiresIn: params.expiresInSeconds ?? 60 * 10,
  });

  return { key, uploadUrl, publicUrl: getPublicUrl(key) };
}

export function isManagedUploadKey(key: string, folder: "sessions" | "portraits") {
  return new RegExp(`^${folder}\\/[A-Za-z0-9_-]+\\.[a-z0-9]+$`).test(key);
}
