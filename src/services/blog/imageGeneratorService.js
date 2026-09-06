import { GoogleAuth } from "google-auth-library";
import sharp from "sharp";
import { uploadBufferToCloudinary } from "../../config/cloudinary.js";
import { configDotenv } from "dotenv";
import path from "path";

configDotenv();

/**
 * Image Generator Service — Stage 5 (Vertex AI Direct API Version)
 *
 * Auth: Uses dedicated Google Cloud Service Account credentials (from VERTEX_KEY_PATH).
 */

const PROJECT_ID = process.env.VERTEX_PROJECT_ID;
const LOCATION = "us-central1";
const IMAGE_W = 1200;
const IMAGE_H = 630;
const COVER_DIR = "blog-covers";

// Initialize Google Auth with the service account key
const auth = new GoogleAuth({
  keyFilename: path.resolve(process.env.VERTEX_KEY_PATH),
  scopes: "https://www.googleapis.com/auth/cloud-platform",
});

/**
 * Build an Imagen prompt from keyword + title.
 */
function buildImagePrompt(keyword, title) {
  return `Professional blog cover image for an article titled "${title}" about "${keyword}". 
Cinematic photography style, dramatic lighting, high contrast, ultra-detailed, 4K resolution.
Technology and business aesthetic. Dark teal and indigo gradients. No text, no watermarks.
Wide landscape format (16:9). Suitable for a tech blog header.`;
}

/**
 * Generate a Sharp-based gradient fallback image.
 */
async function generateGradientFallback(title) {
  const svgText = Buffer.from(`
    <svg width="${IMAGE_W}" height="${IMAGE_H}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#0f2027"/>
          <stop offset="50%" style="stop-color:#203a43"/>
          <stop offset="100%" style="stop-color:#2c5364"/>
        </linearGradient>
      </defs>
      <rect width="${IMAGE_W}" height="${IMAGE_H}" fill="url(#bg)"/>
    </svg>
  `);

  return sharp(svgText).webp({ quality: 90 }).toBuffer();
}

/**
 * Add title text overlay using Sharp.
 */
/**
 * Escape special XML characters to prevent SVG parse errors.
 */
function escapeXml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

async function addTextOverlay(imageBuffer, title) {
  const rawTitle = title.length > 70 ? title.substring(0, 67) + "..." : title;
  const displayTitle = escapeXml(rawTitle);

  const textSvg = Buffer.from(`
    <svg width="${IMAGE_W}" height="${IMAGE_H}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="textBg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="transparent"/>
          <stop offset="60%" stop-color="rgba(0,0,0,0.7)"/>
          <stop offset="100%" stop-color="rgba(0,0,0,0.92)"/>
        </linearGradient>
      </defs>
      <rect y="${IMAGE_H * 0.4}" width="${IMAGE_W}" height="${IMAGE_H * 0.6}" fill="url(#textBg)"/>
      
      <text
        x="60" y="${IMAGE_H - 110}"
        font-family="Arial, sans-serif"
        font-size="20"
        font-weight="600"
        letter-spacing="4"
        fill="#4ECDC4"
        text-transform="uppercase">CLOUDVYN</text>
      
      <foreignObject x="60" y="${IMAGE_H - 95}" width="${IMAGE_W - 120}" height="85">
        <body xmlns="http://www.w3.org/1999/xhtml">
          <p style="
            font-family: Arial, sans-serif;
            font-size: 32px;
            font-weight: 700;
            color: white;
            line-height: 1.25;
            margin: 0;
          ">${displayTitle}</p>
        </body>
      </foreignObject>
    </svg>
  `);

  return sharp(imageBuffer)
    .resize(IMAGE_W, IMAGE_H, { fit: "cover", position: "center" })
    .composite([{ input: textSvg, blend: "over" }])
    .webp({ quality: 88 })
    .toBuffer();
}

/**
 * Generate a cover image using Vertex AI Imagen 3 API directly.
 */
export async function generateCoverImage(postId, keyword, title) {
  console.log(`[Image] Generating cover (Direct Vertex API) for: "${title}"`);

  let rawImageBuffer;

  try {
    const client = await auth.getClient();
    const accessToken = await client.getAccessToken();

    const imagePrompt = buildImagePrompt(keyword, title);

    const response = await fetch(
      `https://${LOCATION}-aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/${LOCATION}/publishers/google/models/imagen-3.0-generate-001:predict`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          instances: [
            {
              prompt: imagePrompt,
            },
          ],
          parameters: {
            sampleCount: 1,
            aspectRatio: "16:9",
          },
        }),
      }
    );

    const data = await response.json();

    if (!data.predictions || data.predictions.length === 0) {
      console.error("[Image] Vertex AI API Error:", JSON.stringify(data, null, 2));
      throw new Error("Imagen 3 did not return any predictions.");
    }

    const base64Res = data.predictions[0].bytesBase64Encoded;
    if (!base64Res) throw new Error("No image data in Vertex AI response.");

    rawImageBuffer = Buffer.from(base64Res, "base64");
    console.log("[Image] Vertex AI Imagen generated successfully via direct API.");
  } catch (err) {
    console.warn(`[Image] Vertex AI Generation failed (${err.message}). Using fallback.`);
    rawImageBuffer = await generateGradientFallback(title);
  }

  // Finalize with overlay and upload
  const finalBuffer = await addTextOverlay(rawImageBuffer, title);
  const fileName = `post-${postId}-${Date.now()}`;
  const publicUrl = await uploadBufferToCloudinary(finalBuffer, fileName, COVER_DIR);

  console.log(`[Image] Automation success — Cloudinary URL: ${publicUrl}`);
  return publicUrl;
}
