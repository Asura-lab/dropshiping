import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { randomUUID } from "crypto";

const accountId = process.env.R2_ACCOUNT_ID!;

export const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

const BUCKET = process.env.R2_BUCKET_NAME ?? "dropshipping-images";
const PUBLIC_URL = (process.env.R2_PUBLIC_URL ?? "").replace(/\/$/, "");

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

export function getPublicUrl(key: string) {
  return `${PUBLIC_URL}/${key}`;
}

export async function createPresignedUpload(
  contentType: string,
  folder = "products"
): Promise<{ uploadUrl: string; publicUrl: string; key: string }> {
  if (!ALLOWED_TYPES.includes(contentType)) {
    throw new Error("Зөвшөөрөгдөөгүй файлын төрөл. JPEG, PNG, WEBP, GIF байх ёстой.");
  }

  const ext = contentType.split("/")[1]?.replace("jpeg", "jpg") ?? "jpg";
  const key = `${folder}/${randomUUID()}.${ext}`;

  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    ContentType: contentType,
    ContentLength: MAX_SIZE_BYTES,
  });

  const uploadUrl = await getSignedUrl(r2, command, { expiresIn: 300 }); // 5 min

  return { uploadUrl, publicUrl: getPublicUrl(key), key };
}

export async function deleteObject(key: string) {
  await r2.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
}
