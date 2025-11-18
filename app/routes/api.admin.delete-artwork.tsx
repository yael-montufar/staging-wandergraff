import { type ActionFunction } from "react-router";
import { getAuthTokenFromCookie, getUserFromToken } from "~/lib/auth.server";

export const action: ActionFunction = async ({ request }) => {
  if (request.method !== "POST") {
    return { error: "Method not allowed" };
  }

  const cookieHeader = request.headers.get("cookie");
  const token = getAuthTokenFromCookie(cookieHeader);
  const user = getUserFromToken(token);

  if (!user || user.role !== "ADMIN") {
    return { error: "Unauthorized" }, { status: 403 };
  }

  const formData = await request.formData();
  const artworkId = formData.get("artworkId") as string;

  if (!artworkId) {
    return { error: "Artwork ID is required" };
  }

  try {
    const { deleteArtwork } = await import("~/lib/artworks.server");
    
    await deleteArtwork(artworkId);
    
    return { success: true, artworkId };
  } catch (error) {
    console.error("[ADMIN] Error deleting artwork:", error);
    return {
      error: error instanceof Error ? error.message : "Failed to delete artwork",
    };
  }
};
