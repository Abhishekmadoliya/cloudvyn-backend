import { v2 as cloudinary } from "cloudinary";
import { configDotenv } from "dotenv";

configDotenv();

/**
 * Cloudinary Upload Service
 *
 * Required .env:
 *   CLOUDINARY_CLOUD_NAME  — Dashboard → Cloud name
 *   CLOUDINARY_API_KEY     — Dashboard → API Key
 *   CLOUDINARY_API_SECRET  — Dashboard → API Secret
 */

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Upload a buffer to Cloudinary and return the public URL.
 *
 * @param {Buffer} buffer      - Image data (WebP, JPEG, PNG)
 * @param {string} fileName    - Used as public_id (e.g. "blog-covers/post-abc123")
 * @param {string} folder      - Cloudinary folder (default: "blog-covers")
 * @returns {Promise<string>}  - Secure HTTPS URL of the uploaded image
 */
export async function uploadBufferToCloudinary(
  buffer,
  fileName,
  folder = "blog-covers"
) {
  if (
    !process.env.CLOUDINARY_CLOUD_NAME ||
    !process.env.CLOUDINARY_API_KEY ||
    !process.env.CLOUDINARY_API_SECRET
  ) {
    throw new Error(
      "Cloudinary credentials missing. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET in .env"
    );
  }

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        public_id: fileName,
        folder,
        resource_type: "image",
        format: "webp",
        overwrite: true,
        transformation: [
          { quality: "auto:good", fetch_format: "webp" },
        ],
      },
      (error, result) => {
        if (error) {
          reject(new Error(`Cloudinary upload failed: ${error.message}`));
        } else {
          resolve(result.secure_url);
        }
      }
    );

    uploadStream.end(buffer);
  });
}

/**
 * Upload candidate resume document (PDF, DOCX) to Cloudinary
 *
 * @param {Buffer} buffer      - File data buffer
 * @param {string} fileName    - Original file name
 * @param {string} folder      - Cloudinary folder (default: "resumes")
 * @returns {Promise<{ url: string, publicId: string, format: string, bytes: number }>}
 */
export async function uploadResumeToCloudinary(
  buffer,
  fileName,
  folder = "resumes"
) {
  if (
    !process.env.CLOUDINARY_CLOUD_NAME ||
    !process.env.CLOUDINARY_API_KEY ||
    !process.env.CLOUDINARY_API_SECRET
  ) {
    throw new Error(
      "Cloudinary credentials missing. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET in .env"
    );
  }

  return new Promise((resolve, reject) => {
    const ext = fileName && fileName.includes(".") ? fileName.slice(fileName.lastIndexOf(".")).toLowerCase() : ".pdf";
    const baseName = (fileName || "document").replace(/\.[^/.]+$/, "").replace(/[^a-zA-Z0-9_-]/g, "_");
    const fullPublicId = `${Date.now()}-${baseName}${ext}`;

    const uploadStream = cloudinary.uploader.upload_stream(
      {
        public_id: fullPublicId,
        folder,
        resource_type: "raw",
        overwrite: true,
      },
      (error, result) => {
        if (error) {
          reject(new Error(`Cloudinary document upload failed: ${error.message}`));
        } else {
          resolve({
            url: result.secure_url,
            publicId: result.public_id,
            format: result.format || ext.replace(".", ""),
            bytes: result.bytes,
          });
        }
      }
    );

    uploadStream.end(buffer);
  });
}

export { cloudinary };
