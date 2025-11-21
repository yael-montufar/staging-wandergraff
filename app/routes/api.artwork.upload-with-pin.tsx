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
  const latitude = parseFloat(formData.get("latitude") as string);
  const longitude = parseFloat(formData.get("longitude") as string);
  const address = formData.get("address") as string;
  const isPrivate = formData.get("isPrivateValue") === "true";

  if (!photoFile) {
    return new Response(JSON.stringify({ error: "Photo file is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (isNaN(latitude) || isNaN(longitude)) {
    return new Response(JSON.stringify({ error: "Valid coordinates are required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    return new Response(JSON.stringify({ error: "Invalid coordinates" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    console.log("[API_UPLOAD_PIN] Processing file:", photoFile.name, "size:", photoFile.size);
    console.log("[API_UPLOAD_PIN] Creating artwork at:", latitude, longitude);

    const { createArtwork } = await import("~/lib/artworks.server");
    const { createPhoto } = await import("~/lib/photos.server");

    // Create the artwork first
    const artwork = await createArtwork(latitude, longitude, user.id, {
      address: address || undefined,
    });

    console.log("[API_UPLOAD_PIN] Artwork created:", artwork.id);

    // Save file to disk and get the public URL
    const photoUrl = await saveUploadedFile(photoFile);
    console.log("[API_UPLOAD_PIN] File saved to:", photoUrl);

    // Create the photo for the artwork
    const photo = await createPhoto(
      user.id,
      photoUrl,
      new Date(),
      {
        artworkId: isPrivate ? undefined : artwork.id,
        isPrivate,
      }
    );

    console.log("[API_UPLOAD_PIN] Photo created in DB:", photo.id);

    return new Response(
      JSON.stringify({ success: true, photoId: photo.id, artworkId: artwork.id }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("[API_UPLOAD_PIN] Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to create artwork and upload photo";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
