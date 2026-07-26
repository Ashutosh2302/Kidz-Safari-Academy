import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { nanoid } from "nanoid";

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

function getPublicUrl(key: string) {
  const base = process.env.S3_PUBLIC_BASE_URL?.replace(/\/$/, "");
  if (!base) {
    throw new Error("S3_PUBLIC_BASE_URL is not set");
  }
  return `${base}/${key}`;
}

export async function uploadToS3(params: {
  file: Buffer;
  contentType: string;
  filename: string;
  folder?: string;
}) {
  const bucket = process.env.S3_BUCKET;
  if (!bucket) {
    throw new Error("S3_BUCKET is not set");
  }

  const ext = params.filename.includes(".")
    ? params.filename.split(".").pop()
    : "bin";
  const folder = params.folder ?? "sessions";
  const key = `${folder}/${nanoid()}.${ext}`;

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
