import type { Route } from "./+types/api.user.walls";

export const loader: Route.LoaderFunction = async ({ request }) => {
  try {
    const { getAuthTokenFromCookie, getUserFromToken } = await import("~/lib/auth.server");
    const { getUserCollections } = await import("~/lib/collections.server");

    const token = getAuthTokenFromCookie(request.headers.get("cookie") || "");
    if (!token) {
      return { walls: [] };
    }

    const user = await getUserFromToken(token);
    if (!user) {
      return { walls: [] };
    }

    const collections = await getUserCollections(user.id);

    // Transform collections to walls format
    const walls = collections.map((collection: any) => ({
      id: collection.id,
      name: collection.name,
      isPublic: collection.isPublic,
      items: collection.items,
    }));

    return { walls };
  } catch (error) {
    console.error("[API] Error fetching walls:", error);
    return { walls: [] };
  }
};
