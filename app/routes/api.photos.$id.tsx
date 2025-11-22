import type { Route } from "./+types/api.photos.$id";

function json(data: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(data), {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
}

export const action: Route.ActionFunction = async ({ request, params }) => {
  if (request.method !== "DELETE") {
    return json({ error: "Method not allowed" }, { status: 405 });
  }

  const { getAuthTokenFromCookie, getUserFromToken } = await import("~/lib/auth.server");
  const { prismaClient } = await import("~/lib/db.server");

  const cookieHeader = request.headers.get("cookie");
  const token = getAuthTokenFromCookie(cookieHeader);
  const user = getUserFromToken(token);

  if (!user) {
    return json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const prisma = await prismaClient();
    const photo = await prisma.photo.findUnique({
      where: { id: params.id },
      select: { userId: true, artworkId: true },
    });

    if (!photo) {
      return json({ error: "Photo not found" }, { status: 404 });
    }

    // Only the owner or admins can delete
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { role: true },
    });

    const isOwner = photo.userId === user.id;
    const isAdmin = dbUser?.role === "ADMIN";

    if (!isOwner && !isAdmin) {
      return json({ error: "Not authorized" }, { status: 403 });
    }

    // Delete the photo
    await prisma.photo.delete({
      where: { id: params.id },
    });

    return json({ success: true });
  } catch (error) {
    console.error("[API] Error deleting photo:", error);
    return json(
      { error: error instanceof Error ? error.message : "Failed to delete photo" },
      { status: 500 }
    );
  }
};
