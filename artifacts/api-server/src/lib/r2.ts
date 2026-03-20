import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const accountId = process.env.R2_ACCOUNT_ID!;
const accessKeyId = process.env.R2_ACCESS_KEY_ID!;
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY!;
const bucketName = process.env.R2_BUCKET_NAME!;
const publicUrlBase = (process.env.R2_PUBLIC_URL ?? "").replace(/\/$/, "");

export const r2Client = new S3Client({
  region: "auto",
  endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId,
    secretAccessKey,
  },
  // Disable automatic checksum calculation — Cloudflare R2 does not support
  // the x-amz-checksum-crc32 / x-amz-sdk-checksum-algorithm query params
  // that AWS SDK v3 adds by default to PutObject presigned URLs.
  requestChecksumCalculation: "WHEN_REQUIRED",
  responseChecksumValidation: "WHEN_REQUIRED",
});

export async function getPresignedUploadUrl(
  key: string,
  contentType: string
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    ContentType: contentType,
  });
  return getSignedUrl(r2Client, command, {
    expiresIn: 300,
    // Prevent SDK from hoisting checksum headers into the signed query string
    unhoistableHeaders: new Set([
      "x-amz-checksum-crc32",
      "x-amz-sdk-checksum-algorithm",
      "x-amz-checksum-algorithm",
    ]),
  });
}

export function getPublicUrl(key: string): string {
  return `${publicUrlBase}/${key}`;
}
