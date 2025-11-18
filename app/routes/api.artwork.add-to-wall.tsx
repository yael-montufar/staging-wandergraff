import type { Route } from "./+types/api.artwork.add-to-wall";
import { getAuthTokenFromCookie, getUserFromToken } from "~/lib/auth.server";
import { addArtworkToCollection } from "~/lib/collections.server";

export const action: Route.ActionFunction = async ({ request }) => {
  if (request.method !== "POST") {
    return { error: "Method not allowed" }, { status: 405 };
  }

  try {
    const cookieHeader = request.headers.get("cookie");
    const token = getAuthTokenFromCookie(cookieHeader);
    const user = getUserFromToken(token);

    if (!user) {
      return { error: "Unauthorized - please sign in" }, { status: 401 };
    }

    const formData = await request.formData();
    const wallId = formData.get("wallId") as string;
    const artworkId = formData.get("artworkId") as string;

    if (!wallId || !artworkId) {
      return { error: "Wall ID and Artwork ID are required" }, { status: 400 };
    }

    // Add artwork to collection (wall)
    await addArtworkToCollection(wallId, artworkId);

    return { success: true, message: "Added to wall successfully" };
  } catch (error) {
    console.error("[API] Error adding artwork to wall:", error);
    return {
      error: error instanceof Error ? error.message : "Failed to add to wall",
    }, { status: 500 };
  }
};
