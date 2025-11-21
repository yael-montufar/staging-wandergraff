import type { Route } from "./+types/api.user.upload-avatar";

export const action: Route.ActionFunction = async ({ request }) => {
  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const { getAuthTokenFromCookie, getUserFromToken } = await import("~/lib/auth.server");
    const { saveUploadedFile } = await import("~/lib/file-upload.server");
    const { prismaClient } = await import("~/lib/db.server");

    const cookieHeader = request.headers.get("cookie");
    const token = getAuthTokenFromCookie(cookieHeader);
    const user = getUserFromToken(token);

    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const formData = await request.formData();
    const avatarFile = formData.get("avatarFile") as File;

    if (!avatarFile) {
      return new Response(JSON.stringify({ error: "No file provided" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Validate file type
    if (!avatarFile.type.startsWith("image/")) {
      return new Response(JSON.stringify({ error: "File must be an image" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Validate file size (max 5MB for avatars)
    const maxSize = 5 * 1024 * 1024;
    if (avatarFile.size > maxSize) {
      return new Response(JSON.stringify({ error: "File size must be less than 5MB" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Convert file to buffer
    const buffer = Buffer.from(await avatarFile.arrayBuffer());

    // Save avatar file
    const avatarUrl = await saveUploadedFile(buffer, "avatar", avatarFile.type);

    // Update user avatar in database
    const prisma = await prismaClient();
    await prisma.user.update({
      where: { id: user.id },
      data: { avatarUrl },
    });

    console.log("[AVATAR UPLOAD] Success. User:", user.id, "Avatar URL:", avatarUrl);

    return new Response(JSON.stringify({ success: true, avatarUrl }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[AVATAR UPLOAD] Error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Upload failed",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};
