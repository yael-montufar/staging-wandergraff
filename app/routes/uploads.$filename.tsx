import { promises as fs } from "fs";
import { join } from "path";
import type { LoaderFunction } from "react-router";

const UPLOAD_DIR = join(process.cwd(), "public", "uploads");

export const loader: LoaderFunction = async ({ params, request }) => {
  const { filename } = params;

  if (!filename || typeof filename !== "string") {
    return new Response("Not Found", { status: 404 });
  }

  try {
    const filepath = join(UPLOAD_DIR, filename);

    // Security: ensure filepath is within uploads directory
    if (!filepath.startsWith(UPLOAD_DIR)) {
      return new Response("Forbidden", { status: 403 });
    }

    // Check if file exists
    try {
      await fs.access(filepath);
    } catch {
      return new Response("Not Found", { status: 404 });
    }

    // Read file
    const fileBuffer = await fs.readFile(filepath);

    // Determine content type
    const contentType = getContentType(filename);

    return new Response(fileBuffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Length": fileBuffer.length.toString(),
        "Cache-Control": "public, max-age=31536000", // 1 year
      },
    });
  } catch (error) {
    console.error("[UPLOADS] Error serving file:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
};

function getContentType(filename: string): string {
  const ext = filename.toLowerCase().split(".").pop();
  const contentTypes: Record<string, string> = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    gif: "image/gif",
    webp: "image/webp",
    svg: "image/svg+xml",
  };
  return contentTypes[ext || ""] || "application/octet-stream";
}
