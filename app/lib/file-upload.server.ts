import { promises as fs } from "fs";
import { join } from "path";
import { randomBytes } from "crypto";

const UPLOAD_DIR = join(process.cwd(), "public", "uploads");

export async function ensureUploadDir() {
  try {
    await fs.mkdir(UPLOAD_DIR, { recursive: true });
  } catch (error) {
    console.error("[FILE_UPLOAD] Error creating upload directory:", error);
    throw error;
  }
}

export async function saveUploadedFile(
  input: File | Buffer,
  type: "photo" | "avatar" = "photo",
  mimeType?: string
): Promise<string> {
  try {
    await ensureUploadDir();

    // Generate unique filename
    const timestamp = Date.now();
    const randomId = randomBytes(8).toString("hex");

    let buffer: Buffer;
    let ext: string;

    if (input instanceof File) {
      buffer = Buffer.from(await input.arrayBuffer());
      ext = getFileExtension(input.name);
      if (!ext && mimeType) {
        ext = getExtensionFromMimeType(mimeType);
      }
    } else {
      buffer = input;
      ext = mimeType ? getExtensionFromMimeType(mimeType) : ".jpg";
    }

    const filename = `${timestamp}-${randomId}${ext}`;
    const filepath = join(UPLOAD_DIR, filename);

    // Write file to disk
    await fs.writeFile(filepath, buffer);

    console.log(`[FILE_UPLOAD] ${type} saved:`, filename);

    // Return public URL path
    return `/uploads/${filename}`;
  } catch (error) {
    console.error("[FILE_UPLOAD] Error saving file:", error);
    throw error instanceof Error ? error : new Error("Failed to save file");
  }
}

export async function deleteUploadedFile(filepath: string): Promise<void> {
  try {
    // Security: ensure filepath is within uploads directory
    const fullPath = join(UPLOAD_DIR, filepath);
    if (!fullPath.startsWith(UPLOAD_DIR)) {
      throw new Error("Invalid file path");
    }

    await fs.unlink(fullPath);
    console.log("[FILE_UPLOAD] File deleted:", filepath);
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
    "image/heic": ".jpg", // We convert HEIC to JPEG
    "image/heif": ".jpg",
  };
  return mimeToExt[mimeType] || ".jpg";
}

export async function readFileAsync(file: File): Promise<Buffer> {
  return Buffer.from(await file.arrayBuffer());
}
