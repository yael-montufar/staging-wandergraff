import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";
import { randomBytes } from "crypto";

export type StorageMode = "LOCAL" | "SUPABASE";

/**
 * Determines the storage mode based on the environment variable.
 * Defaults to SUPABASE (for staging/production).
 * Set STORAGE_MODE=LOCAL for local development with docker-in-docker.
 */
export function getStorageMode(): StorageMode {
  return (process.env.STORAGE_MODE as StorageMode) || "SUPABASE";
}

/**
 * Gets image URLs for seeding, supporting both local and cloud storage.
 * 
 * LOCAL mode:
 * - Reads images from public/uploads directory
 * - Returns URLs pointing to /uploads/{filename}
 * - No upload needed, files are served directly
 * 
 * SUPABASE mode:
 * - Checks if images already exist in Supabase storage
 * - Uploads images from public/uploads if needed
 * - Returns Supabase public URLs
 */
export async function getOrUploadSeedImages(): Promise<string[]> {
  const storageMode = getStorageMode();

  if (storageMode === "LOCAL") {
    return getLocalSeedImages();
  } else {
    return getSupabaseSeedImages();
  }
}

/**
 * Returns URLs for seed images stored locally in public/uploads.
 * Used during local development with docker-in-docker.
 */
function getLocalSeedImages(): string[] {
  try {
    const uploadsDir = path.join(process.cwd(), "public", "uploads");

    if (!fs.existsSync(uploadsDir)) {
      console.warn("⚠️  public/uploads directory not found. No seed images available.");
      return [];
    }

    const files = fs.readdirSync(uploadsDir).filter((f) => f.endsWith(".jpg"));

    if (files.length === 0) {
      console.warn("⚠️  No JPG files found in public/uploads");
      return [];
    }

    const imageUrls = files.map((file) => `/uploads/${file}`);
    console.log(`✓ Using ${imageUrls.length} local seed images from public/uploads`);
    return imageUrls;
  } catch (error) {
    console.error("Error accessing local seed images:", error);
    return [];
  }
}

/**
 * Uploads seed images to Supabase Storage.
 * Checks if images already exist before uploading.
 * Used for staging and production environments.
 */
async function getSupabaseSeedImages(): Promise<string[]> {
  try {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error(
        "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables"
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const SEED_BUCKET = "artwork-photos";

    // Check if seed photos already exist
    const { data: existingFiles, error: listError } = await supabase.storage
      .from(SEED_BUCKET)
      .list("seed", { limit: 500 });

    if (!listError && existingFiles && existingFiles.length > 0) {
      console.log(
        `✓ Found ${existingFiles.length} existing seed images in Supabase storage`
      );
      // Return existing image URLs
      return existingFiles.map((file) => {
        const { data: publicUrl } = supabase.storage
          .from(SEED_BUCKET)
          .getPublicUrl(`seed/${file.name}`);
        return publicUrl.publicUrl;
      });
    }

    // Upload seed images
    console.log("⏳ Uploading seed images to Supabase Storage...");
    const uploadsDir = path.join(process.cwd(), "public", "uploads");
    const files = fs.readdirSync(uploadsDir).filter((f) => f.endsWith(".jpg"));

    const uploadedUrls: string[] = [];

    for (const fileName of files) {
      const localFilePath = path.join(uploadsDir, fileName);
      const fileBuffer = fs.readFileSync(localFilePath);
      const timestamp = Date.now();
      const randomId = randomBytes(8).toString("hex");
      const filename = `${timestamp}-${randomId}.jpg`;
      const remotePath = `seed/${filename}`;

      const { error, data } = await supabase.storage
        .from(SEED_BUCKET)
        .upload(remotePath, fileBuffer, {
          contentType: "image/jpeg",
          upsert: false,
        });

      if (error) {
        console.error(`Error uploading ${fileName}:`, error);
        continue;
      }

      const { data: publicUrl } = supabase.storage
        .from(SEED_BUCKET)
        .getPublicUrl(remotePath);

      uploadedUrls.push(publicUrl.publicUrl);
    }

    console.log(`✓ Uploaded ${uploadedUrls.length} images to Supabase Storage`);
    return uploadedUrls;
  } catch (error) {
    console.error("Error managing Supabase seed images:", error);
    return [];
  }
}
