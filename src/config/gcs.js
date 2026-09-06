import { Storage } from "@google-cloud/storage";
import { configDotenv } from "dotenv";

configDotenv();

/**
 * Google Cloud Storage client factory.
 *
 * Required .env variables:
 *   GCS_BUCKET_NAME=your-gcs-bucket-name
 *
 *   Option A — Service account key file path (local dev):
 *   GCS_KEY_FILE=./gcloud-service-key.json
 *
 *   Option B — Inline JSON string (recommended for VPS env vars):
 *   GCS_KEY_JSON={"type":"service_account","project_id":"...","private_key":"..."}
 *
 *   Option C — Application Default Credentials (GCP-hosted machines):
 *   Neither GCS_KEY_FILE nor GCS_KEY_JSON needed — ADC picks up automatically.
 *
 * GCS IAM setup:
 *   - Create a service account in GCP Console
 *   - Assign role: "Storage Object Admin"
 *   - Download the JSON key → set GCS_KEY_FILE or GCS_KEY_JSON
 *   - Make the bucket public: allUsers → Storage Object Viewer
 */

let storageOptions = {};

if (process.env.GCS_KEY_JSON) {
  // Inline JSON credentials (recommended for production VPS)
  try {
    storageOptions.credentials = JSON.parse(process.env.GCS_KEY_JSON);
  } catch {
    console.error("[GCS] Invalid GCS_KEY_JSON — could not parse JSON.");
  }
} else if (process.env.GCS_KEY_FILE) {
  // Path to service account JSON file
  storageOptions.keyFilename = process.env.GCS_KEY_FILE;
}
// else: use Application Default Credentials (ADC)

const storage = new Storage(storageOptions);

const bucketName = process.env.GCS_BUCKET_NAME;
if (!bucketName) {
  console.warn("[GCS] GCS_BUCKET_NAME is not set. Image upload will fail.");
}

const bucket = bucketName ? storage.bucket(bucketName) : null;

/**
 * Upload a buffer to GCS and return the public URL.
 * @param {Buffer} buffer - Image data
 * @param {string} fileName - Destination file name (e.g. "covers/post-123.webp")
 * @param {string} contentType - MIME type (default: "image/webp")
 * @returns {Promise<string>} Public URL
 */
export async function uploadBufferToGCS(
  buffer,
  fileName,
  contentType = "image/webp"
) {
  if (!bucket) {
    throw new Error("GCS bucket not configured. Set GCS_BUCKET_NAME in .env");
  }

  const file = bucket.file(fileName);

  await file.save(buffer, {
    contentType,
    metadata: {
      cacheControl: "public, max-age=31536000",
    },
  });

  // Make the file publicly readable
  await file.makePublic();

  return `https://storage.googleapis.com/${bucketName}/${fileName}`;
}

export { storage, bucket, bucketName };
