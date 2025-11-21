import { createClient } from "@supabase/supabase-js";
import { randomBytes } from "crypto";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables"
  );
}

const supabase = createClient(supabaseUrl, supabaseKey);
const BUCKET_NAME = "artwork-photos";

export async function ensureStorageBucket() {
  try {
    const { data: buckets } = await supabase.storage.listBuckets();
    const exists = buckets?.some((b) => b.name === BUCKET_NAME);

    if (!exists) {
      await supabase.storage.createBucket(BUCKET_NAME, {
        public: true,
      });
      console.log(`[FILE_UPLOAD] Created storage bucket: ${BUCKET_NAME}`);
    }
  } catch (error) {
    console.error("[FILE_UPLOAD] Error ensuring bucket:", error);
    throw error;
  }
}

export async function saveUploadedFile(
  input: File | Buffer,
  type: "photo" | "avatar" = "photo",
  mimeType?: string
): Promise<string> {
  try {
    await ensureStorageBucket();

    // Generate unique filename
    const timestamp = Date.now();
    const randomId = randomBytes(8).toString("hex");

    let buffer: Buffer;
    let ext: string;
    let contentType: string;

    if (input instanceof File) {
      buffer = Buffer.from(await input.arrayBuffer());
      ext = getFileExtension(input.name);
      if (!ext && input.type) {
        ext = getExtensionFromMimeType(input.type);
      }
      contentType = input.type || "image/jpeg";
    } else {
      buffer = input;
      ext = mimeType ? getExtensionFromMimeType(mimeType) : ".jpg";
      contentType = mimeType || "image/jpeg";
    }

    const filename = `${timestamp}-${randomId}${ext}`;
    const filePath = `${type}/${filename}`;

    // Upload to Supabase Storage
    const { error, data } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, buffer, {
        contentType,
        upsert: false,
      });

    if (error) {
      throw new Error(`Storage upload failed: ${error.message}`);
    }

    console.log(`[FILE_UPLOAD] ${type} saved to Supabase:`, filename);

    // Return public URL
    const { data: publicUrl } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(filePath);

    return publicUrl.publicUrl;
  } catch (error) {
    console.error("[FILE_UPLOAD] Error saving file:", error);
    throw error instanceof Error ? error : new Error("Failed to save file");
  }
}

export async function deleteUploadedFile(filePath: string): Promise<void> {
  try {
    if (!filePath) return;

    // Extract just the path part if it's a full URL
    let path = filePath;
    if (filePath.includes("/storage/v1/object/public/")) {
      path = filePath.split("artwork-photos/")[1];
    }

    if (!path) {
      console.warn("[FILE_UPLOAD] Could not extract path from:", filePath);
      return;
    }

    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .remove([path]);

    if (error && error.message !== "Not found") {
      throw error;
    }

    console.log("[FILE_UPLOAD] File deleted from Supabase:", path);
  } catch (error) {
    console.error("[FILE_UPLOAD] Error deleting file:", error);
    throw error;
  }
}

function getFileExtension(filename: string): string {
  const match = filename.match(/\.[^.]+$/);
  return match ? match[0] : "";
}

function getExtensionFromMimeType(mimeType: string): string {
  const mimeToExt: Record<string, string> = {
    "image/jpeg": ".jpg",
    "image/jpg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif",
    "image/heic": ".jpg",
    "image/heif": ".jpg",
  };
  return mimeToExt[mimeType] || ".jpg";
}

export async function readFileAsync(file: File): Promise<Buffer> {
  return Buffer.from(await file.arrayBuffer());
}
