import { Link } from "react-router";
import { Navigation } from "../components/Navigation";

export default function HomePage() {
  const artworks: any[] = [];

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />

      <main className="max-w-7xl mx-auto px-4 py-12">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Discover Street Art Around You
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Explore, share, and celebrate street art from around the world
          </p>
          <div className="flex gap-4 justify-center">
            <Link
              to="/artwork/register"
              className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700"
            >
              Register Artwork
            </Link>
            <Link
              to="/map"
              className="bg-gray-200 text-gray-900 px-6 py-2 rounded-md hover:bg-gray-300"
            >
              View Map
            </Link>
          </div>
        </div>

        {/* Gallery Grid */}
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            Recently Added
          </h2>

          {artworks.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-600 text-lg">
                No artworks yet. Be the first to register one!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {artworks.map((artwork) => {
                const defaultGallery = artwork.galleries.find(
                  (g) => g.type === "DEFAULT"
                );
                const primaryPhoto = defaultGallery?.photos[0]?.photo;

                return (
                  <Link
                    key={artwork.id}
                    to={`/artwork/${artwork.id}`}
                    className="group overflow-hidden rounded-lg shadow hover:shadow-lg transition-shadow"
                  >
                    <div className="aspect-square bg-gray-200 overflow-hidden">
                      {primaryPhoto ? (
                        <img
                          src={primaryPhoto.thumbnailUrl || primaryPhoto.photoUrl}
                          alt={artwork.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gray-300">
                          <span className="text-gray-500">No image</span>
                        </div>
                      )}
                    </div>
                    <div className="p-4">
                      <h3 className="font-semibold text-lg text-gray-900">
                        {artwork.title}
                      </h3>
                      <p className="text-sm text-gray-600 mt-1">
                        {artwork.claimStatus === "CLAIMED"
                          ? `Claimed: ${artwork.artist?.name || "Unknown"}`
                          : "Not claimed"}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
