import { useParams, useRouteLoaderData } from "react-router";
import type { Route } from "./+types/artwork.$id";
import { Navigation } from "../components/Navigation";
import { Button } from "../components/ui/Button";
import { getArtwork } from "../lib/artworks.server";
import { getPhotosByArtwork } from "../lib/photos.server";

export const loader: Route.LoaderFunction = async ({ params }) => {
  const { id } = params;
  
  if (!id) {
    throw new Error("Artwork ID is required");
  }

  try {
    const artwork = await getArtwork(id);
    
    if (!artwork) {
      throw new Error("Artwork not found");
    }

    const photos = await getPhotosByArtwork(id, { includePrivate: false });

    return { artwork, photos };
  } catch (error) {
    console.error("[ARTWORK] Error loading artwork:", error);
    throw error;
  }
};

export default function ArtworkDetailPage() {
  const rootData = useRouteLoaderData("root") as any;
  const loaderData = useRouteLoaderData("routes/artwork.$id") as any;
  const artwork = loaderData?.artwork;
  const photos = loaderData?.photos ?? [];

  if (!artwork) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation user={rootData?.user} />
        <main className="max-w-4xl mx-auto px-4 py-12">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Artwork Not Found</h1>
            <p className="text-gray-600 mb-6">The artwork you're looking for doesn't exist.</p>
            <a href="/" className="text-blue-600 hover:text-blue-700 font-medium">
              ← Back to Gallery
            </a>
          </div>
        </main>
      </div>
    );
  }

  const statusLabel = {
    UNCLAIMED: "Unclaimed",
    PENDING_APPROVAL: "Pending Approval",
    CLAIMED: "Claimed by Artist",
  }[artwork.claimStatus || "UNCLAIMED"];

  const statusColor = {
    UNCLAIMED: "bg-gray-100 text-gray-800",
    PENDING_APPROVAL: "bg-yellow-100 text-yellow-800",
    CLAIMED: "bg-green-100 text-green-800",
  }[artwork.claimStatus || "UNCLAIMED"];

  // Separate photos into official (artist-curated) and community
  const officialPhotos = artwork.claimStatus === "CLAIMED"
    ? photos.filter((photo: any) => photo.userId === artwork.artist?.id)
    : [];
  const communityPhotos = photos.filter((photo: any) =>
    artwork.claimStatus !== "CLAIMED" || photo.userId !== artwork.artist?.id
  );

  const primaryPhoto = officialPhotos[0] || communityPhotos[0];

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation user={rootData?.user} />

      <main className="max-w-4xl mx-auto px-4 py-12">
        {/* Header with Back Button */}
        <div className="mb-8">
          <button
            onClick={() => window.history.back()}
            className="text-blue-600 hover:text-blue-700 font-medium flex items-center gap-2"
          >
            ← Back
          </button>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left: Image/Gallery */}
          <div className="lg:col-span-2">
            {primaryPhoto ? (
              <div className="space-y-6">
                {/* Featured Photo */}
                <div className="bg-white rounded-lg shadow-md overflow-hidden">
                  <img
                    src={primaryPhoto.photoUrl}
                    alt={artwork.title}
                    className="w-full h-96 object-cover"
                  />
                </div>

                {/* Official Gallery - Artist Curated */}
                {officialPhotos.length > 0 && (
                  <div className="bg-white rounded-lg shadow-md p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-sm font-semibold text-gray-900">Official Gallery</span>
                      <span className="text-xs font-medium px-2 py-1 bg-blue-100 text-blue-800 rounded">
                        Curated by Artist
                      </span>
                    </div>
                    {officialPhotos.length > 0 && (
                      <div className="grid grid-cols-4 gap-2">
                        {officialPhotos.map((photo: any) => (
                          <div key={photo.id} className="aspect-square rounded overflow-hidden bg-gray-100">
                            <img
                              src={photo.thumbnailUrl || photo.photoUrl}
                              alt="Official"
                              className="w-full h-full object-cover hover:opacity-75 cursor-pointer transition"
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Community Gallery */}
                {communityPhotos.length > 0 && (
                  <div className="bg-white rounded-lg shadow-md p-4">
                    <p className="text-sm font-semibold text-gray-900 mb-3">
                      Community Photos ({communityPhotos.length})
                    </p>
                    <div className="grid grid-cols-4 gap-2">
                      {communityPhotos.map((photo: any) => (
                        <div key={photo.id} className="aspect-square rounded overflow-hidden bg-gray-100">
                          <img
                            src={photo.thumbnailUrl || photo.photoUrl}
                            alt="Community"
                            className="w-full h-full object-cover hover:opacity-75 cursor-pointer transition"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-gray-200 rounded-lg shadow-md h-96 flex items-center justify-center">
                <div className="text-center text-gray-500">
                  <p className="text-lg">No photos yet</p>
                  <p className="text-sm mt-2">Be the first to upload a photo</p>
                </div>
              </div>
            )}
          </div>

          {/* Right: Details Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-md p-6 space-y-6">
              {/* Title and Status */}
              <div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">{artwork.title}</h1>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-medium px-3 py-1 rounded-full ${statusColor}`}>
                    {statusLabel}
                  </span>
                </div>
              </div>

              {/* Artist Info */}
              {artwork.artist && (
                <div>
                  <p className="text-sm text-gray-600 mb-2">Artist</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {artwork.artist.name || artwork.artist.email}
                  </p>
                </div>
              )}

              {/* Year Created */}
              {artwork.yearCreated && (
                <div>
                  <p className="text-sm text-gray-600 mb-2">Year Created</p>
                  <p className="text-lg font-semibold text-gray-900">{artwork.yearCreated}</p>
                </div>
              )}

              {/* Location */}
              <div>
                <p className="text-sm text-gray-600 mb-2">Location</p>
                <p className="text-sm font-mono text-gray-900">
                  {artwork.latitude.toFixed(6)}, {artwork.longitude.toFixed(6)}
                </p>
              </div>

              {/* Photo Galleries Info */}
              <div>
                <p className="text-sm text-gray-600 mb-2">Photo Galleries</p>
                <div className="space-y-1 text-sm">
                  {officialPhotos.length > 0 && (
                    <p className="text-gray-700"><span className="font-semibold">{officialPhotos.length}</span> official {officialPhotos.length === 1 ? "photo" : "photos"}</p>
                  )}
                  {communityPhotos.length > 0 && (
                    <p className="text-gray-700"><span className="font-semibold">{communityPhotos.length}</span> community {communityPhotos.length === 1 ? "photo" : "photos"}</p>
                  )}
                  {photos.length === 0 && (
                    <p className="text-gray-500">No photos yet</p>
                  )}
                </div>
              </div>

              {/* Description */}
              {artwork.description && (
                <div>
                  <p className="text-sm text-gray-600 mb-2">Description</p>
                  <p className="text-gray-700 text-sm leading-relaxed">
                    {artwork.description}
                  </p>
                </div>
              )}

              {/* Actions */}
              <div className="pt-4 border-t">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => (window.location.href = `/artwork/upload?artworkId=${artwork.id}`)}
                  className="w-full"
                >
                  📸 Add Your Photo
                </Button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-md mx-auto text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Error Loading Artwork</h1>
        <p className="text-gray-600 mb-6">
          {error instanceof Error ? error.message : "An error occurred while loading this artwork."}
        </p>
        <a href="/" className="text-blue-600 hover:text-blue-700 font-medium">
          ← Back to Gallery
        </a>
      </div>
    </div>
  );
}
