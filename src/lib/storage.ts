import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";

const ENDPOINT = process.env.MINIO_ENDPOINT!;
const ACCESS_KEY = process.env.MINIO_ACCESS_KEY!;
const SECRET_KEY = process.env.MINIO_SECRET_KEY!;
const BUCKET = process.env.MINIO_BUCKET_NAME!;
const PUBLIC_URL = process.env.MINIO_PUBLIC_URL!;

const s3 = new S3Client({
  endpoint: ENDPOINT,
  region: "us-east-1", // MinIO requires a region string but ignores it
  credentials: {
    accessKeyId: ACCESS_KEY,
    secretAccessKey: SECRET_KEY,
  },
  forcePathStyle: true, // Required for MinIO self-hosted
});

/**
 * Upload a file to MinIO and return its public URL.
 * @param file     - Raw file bytes (ArrayBuffer)
 * @param fileName - Original filename (will be sanitized by caller)
 * @param contentType - MIME type
 * @param folder   - Optional sub-folder inside the bucket (default: "assets")
 */
export async function uploadFile(
  file: ArrayBuffer,
  fileName: string,
  contentType: string,
  folder: string = "assets"
): Promise<string> {
  const key = `${folder}/${Date.now()}-${fileName}`;

  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: Buffer.from(file),
      ContentType: contentType,
    })
  );

  // Return the public URL: <endpoint>/<bucket>/<key>
  return `${PUBLIC_URL}/${BUCKET}/${key}`;
}

/**
 * Delete a file from MinIO given its public URL.
 */
export async function deleteFile(fileUrl: string): Promise<void> {
  try {
    // Extract the key by removing the "<endpoint>/<bucket>/" prefix
    const prefix = `${PUBLIC_URL}/${BUCKET}/`;
    const key = fileUrl.startsWith(prefix)
      ? fileUrl.slice(prefix.length)
      : new URL(fileUrl).pathname.replace(`/${BUCKET}/`, "");

    if (!key) return;

    await s3.send(
      new DeleteObjectCommand({
        Bucket: BUCKET,
        Key: key,
      })
    );
  } catch (err) {
    // Log but don't throw — a missing file should not block DB operations
    console.error("deleteFile (MinIO) error:", err);
  }
}
