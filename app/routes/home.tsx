import { useRouteLoaderData, redirect } from "react-router";
import type { Route } from "./+types/home";
import { Navigation } from "../components/Navigation";
import { Button } from "../components/ui/Button";
import { EmptyState } from "../components/ui/EmptyState";
import { GalleryGrid } from "../components/GalleryGrid";
import { ArtworkCard } from "../components/ArtworkCard";
import { getRecentArtworks } from "../lib/artworks.server";

export const loader: Route.LoaderFunction = async ({ request }) => {
  // Check if user is admin and redirect to dashboard
  const { getAuthTokenFromCookie, getUserFromToken } = await import("~/lib/auth.server");
  const { prismaClient } = await import("~/lib/db.server");

  const cookieHeader = request.headers.get("cookie");
  const token = getAuthTokenFromCookie(cookieHeader);
  const user = getUserFromToken(token);

  if (user) {
    const prisma = await prismaClient();
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { role: true },
    });

    if (dbUser?.role === "ADMIN") {
      return redirect("/admin/dashboard");
    }
  }

  try {
    const artworks = await getRecentArtworks(20);
    return { artworks, currentUserId: user?.id };
  } catch (error) {
    console.error("[HOME] Error loading artworks:", error);
    return { artworks: [], currentUserId: user?.id };
  }
};

export default function HomePage() {
  const rootData = useRouteLoaderData("root") as any;
  const loaderData = useRouteLoaderData("routes/home") as any;
  const artworks = loaderData?.artworks ?? [];
  const currentUserId = loaderData?.currentUserId;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation user={rootData?.user} />

      <main className="max-w-7xl mx-auto px-4 py-12">
        {/* Gallery Section */}
        <section>
          {artworks.length === 0 ? (
            <EmptyState
              title="No murals pinned yet"
              description="Be the first to pin a mural and start building our community gallery!"
              icon="📍"
              action={{
                label: rootData?.user ? "Pin the First Mural" : "Sign In to Pin",
                onClick: () => (window.location.href = rootData?.user ? "/artwork/register" : "/auth/login"),
              }}
            />
          ) : (
            <GalleryGrid columns={3} gap="md">
              {artworks.map((artwork: any) => (
                <ArtworkCard
                  key={artwork.id}
                  id={artwork.id}
                  title={artwork.title}
                  imageUrl={artwork.photos?.[0]?.photoUrl}
                  artistName={artwork.artist?.name}
                  claimStatus={artwork.claimStatus}
                  artworkArtistId={artwork.artistId}
                  currentUserId={currentUserId}
                  currentUser={rootData?.user}
                  photoCount={artwork.photos?.length ?? 0}
                  onClick={() => (window.location.href = `/artwork/${artwork.id}`)}
                />
              ))}
            </GalleryGrid>
          )}
        </section>
      </main>
    </div>
  );
}
