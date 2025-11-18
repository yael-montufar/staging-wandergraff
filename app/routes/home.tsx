import { useRouteLoaderData } from "react-router";
import type { Route } from "./+types/home";
import { Navigation } from "../components/Navigation";
import { Button } from "../components/ui/Button";
import { EmptyState } from "../components/ui/EmptyState";
import { GalleryGrid } from "../components/GalleryGrid";
import { ArtworkCard } from "../components/ArtworkCard";
import { getRecentArtworks } from "../lib/artworks.server";

export const loader: Route.LoaderFunction = async () => {
  try {
    const artworks = await getRecentArtworks(20);
    return { artworks };
  } catch (error) {
    console.error("[HOME] Error loading artworks:", error);
    return { artworks: [] };
  }
};

export default function HomePage() {
  const rootData = useRouteLoaderData("root") as any;
  const loaderData = useRouteLoaderData("routes/home") as any;
  const artworks = loaderData?.artworks ?? [];

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation user={rootData?.user} />

      <main className="max-w-7xl mx-auto px-4 py-12">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Discover Street Art Around You
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Explore, share, and celebrate street art from around the world
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            {rootData?.user ? (
              <Button
                variant="primary"
                size="lg"
                onClick={() => (window.location.href = "/artwork/register")}
              >
                📍 Pin a Mural
              </Button>
            ) : (
              <Button
                variant="primary"
                size="lg"
                onClick={() => (window.location.href = "/auth/login")}
              >
                Sign In to Pin
              </Button>
            )}
            <Button
              variant="secondary"
              size="lg"
              onClick={() => (window.location.href = "/map")}
            >
              View Map
            </Button>
          </div>
        </div>

        {/* Gallery Section */}
        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-8">
            Recently Added
          </h2>

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
                  photoCount={artwork.photos?.length ?? 0}
                  onClick={() => (window.location.href = `/artwork/${artwork.id}`)}
                />
              ))}
            </GalleryGrid>
          )}
        </section>

        {/* Quick Links Section */}
        <section className="mt-16 pt-12 border-t border-gray-200">
          <h3 className="text-xl font-bold text-gray-900 mb-6">
            Explore Street Art
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <h4 className="font-semibold text-gray-900 mb-2">
                Browse by Artist
              </h4>
              <p className="text-gray-600 text-sm mb-4">
                Discover works by talented street artists from around the world
              </p>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => (window.location.href = "/discover/artists")}
              >
                View Artists
              </Button>
            </div>
            <div className="text-center">
              <h4 className="font-semibold text-gray-900 mb-2">
                Browse by Year
              </h4>
              <p className="text-gray-600 text-sm mb-4">
                See how street art has evolved over time
              </p>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => (window.location.href = "/discover/years")}
              >
                View Timeline
              </Button>
            </div>
            <div className="text-center">
              <h4 className="font-semibold text-gray-900 mb-2">
                Explore on Map
              </h4>
              <p className="text-gray-600 text-sm mb-4">
                Find street art near you using our interactive map
              </p>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => (window.location.href = "/map")}
              >
                Open Map
              </Button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
