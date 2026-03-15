import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";

if (!process.env.R2_ACCOUNT_ID) throw new Error("Missing R2_ACCOUNT_ID");
if (!process.env.R2_ACCESS_KEY) throw new Error("Missing R2_ACCESS_KEY");
if (!process.env.R2_SECRET_KEY) throw new Error("Missing R2_SECRET_KEY");
if (!process.env.R2_BUCKET_NAME) throw new Error("Missing R2_BUCKET_NAME");

export const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY,
    secretAccessKey: process.env.R2_SECRET_KEY,
  },
});

export const BUCKET = process.env.R2_BUCKET_NAME;

export function getPublicUrl(storageKey: string): string {
  const base = process.env.R2_PUBLIC_URL?.replace(/\/$/, "");
  return `${base}/${storageKey}`;
}

export async function uploadToR2(
  storageKey: string,
  body: Buffer | Uint8Array,
  contentType: string
): Promise<void> {
  await r2.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: storageKey,
      Body: body,
      ContentType: contentType,
    })
  );
}

export async function deleteFromR2(storageKey: string): Promise<void> {
  await r2.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: storageKey }));
}
