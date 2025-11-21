import { type ActionFunction } from "react-router";
import { getAuthTokenFromCookie, getUserFromToken } from "~/lib/auth.server";
import { saveUploadedFile } from "~/lib/file-upload.server";

export const action: ActionFunction = async ({ request }) => {
  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  const cookieHeader = request.headers.get("cookie");
  const token = getAuthTokenFromCookie(cookieHeader);
  const user = getUserFromToken(token);

  if (!user) {
    return new Response(JSON.stringify({ error: "Not authenticated" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const formData = await request.formData();
  const photoFile = formData.get("photoFile") as File;
  const artworkId = formData.get("artworkId") as string;
  const isPrivate = formData.get("isPrivateValue") === "true";

  if (!photoFile || !artworkId) {
    return new Response(JSON.stringify({ error: "Photo file and artwork ID are required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    console.log("[API_UPLOAD] Processing file:", photoFile.name, "size:", photoFile.size);
    
    const { createPhoto } = await import("~/lib/photos.server");

    // Save file to disk and get the public URL
    const photoUrl = await saveUploadedFile(photoFile);
    console.log("[API_UPLOAD] File saved to:", photoUrl);

    const photo = await createPhoto(
      user.id,
      photoUrl,
      new Date(),
      {
        artworkId: isPrivate ? undefined : artworkId,
        isPrivate,
      }
    );

    console.log("[API_UPLOAD] Photo created in DB:", photo.id);

    return new Response(JSON.stringify({ success: true, photoId: photo.id, artworkId }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[API_UPLOAD] Upload error:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to upload photo";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
