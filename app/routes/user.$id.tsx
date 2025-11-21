import { useRouteLoaderData } from "react-router";
import type { Route } from "./+types/user.$id";
import { Header } from "~/components/Header";
import { useTheme } from "~/lib/useTheme";

type LoaderData = {
  user: {
    id: string;
    name: string;
    email: string;
    avatarUrl?: string;
    bio?: string;
    role: string;
  };
  collections: any[];
  publicPhotos: any[];
  claimedArtworks: any[];
};

export const loader: Route.LoaderFunction = async ({ params, request }) => {
  const { prismaClient } = await import("~/lib/db.server");
  const { getUserCollections } = await import("~/lib/collections.server");

  const { id } = params;

  if (!id) {
    throw new Error("User ID is required");
  }

  try {
    const prisma = await prismaClient();

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        avatarUrl: true,
        bio: true,
        role: true,
      },
    });

    if (!user) {
      throw new Response("User not found", { status: 404 });
    }

    // Get public collections
    const [collections, publicPhotos, claimedArtworks] = await Promise.all([
      prisma.collection.findMany({
        where: {
          userId: id,
          isPublic: true,
        },
        include: {
          items: {
            take: 3,
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.photo.findMany({
        where: {
          userId: id,
          isPrivate: false,
        },
        include: {
          artwork: true,
        },
        orderBy: { uploadedAt: "desc" },
        take: 12,
      }),
      prisma.artwork.findMany({
        where: {
          artistId: id,
          claimStatus: "CLAIMED",
        },
        include: {
          photos: {
            take: 1,
          },
        },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    return {
      user,
      collections,
      publicPhotos,
      claimedArtworks,
    };
  } catch (error) {
    console.error("[USER PROFILE] Error loading user:", error);
    throw error;
  }
};

export default function UserProfilePage() {
  const rootData = useRouteLoaderData("root") as any;
  const loaderData = useRouteLoaderData("routes/user.$id") as LoaderData;
  const { user, collections, publicPhotos, claimedArtworks } = loaderData;
  const { scheme, noiseColor } = useTheme();

  const isArtist = user.role === "ARTIST";

  if (!user) {
    return (
      <div
        className="min-h-screen relative"
        suppressHydrationWarning
        style={{
          backgroundColor: scheme.primaryBg,
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='2.5' numOctaves='4' seed='2'/%3E%3CfeColorMatrix type='saturate' values='0.08'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' fill='%23${noiseColor}' filter='url(%23noise)' opacity='0.5'/%3E%3C/svg%3E")`,
          backgroundAttachment: "fixed",
        }}
      >
        <Header user={rootData?.user} />
        <main className="max-w-4xl mx-auto px-4 py-12">
          <div className="text-center" style={{ color: scheme.text }}>
            <h1 className="text-2xl font-bold mb-4">User Not Found</h1>
            <a href="/" className="font-medium hover:opacity-80" style={{ color: scheme.accent }}>
              ← Back to Home
            </a>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen relative"
      suppressHydrationWarning
      style={{
        backgroundColor: scheme.primaryBg,
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='2.5' numOctaves='4' seed='2'/%3E%3CfeColorMatrix type='saturate' values='0.08'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' fill='%23${noiseColor}' filter='url(%23noise)' opacity='0.5'/%3E%3C/svg%3E")`,
        backgroundAttachment: "fixed",
      }}
    >
      <Header user={rootData?.user} />

      <main className="max-w-6xl mx-auto px-4 py-12">
        {/* Profile Header */}
        <div className="mb-12">
          <div className="flex items-start gap-6 mb-8">
            {user.avatarUrl && (
              <img
                src={user.avatarUrl}
                alt={user.name}
                className="w-32 h-32 rounded-full object-cover"
              />
            )}
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-4xl font-bold text-gray-900">{user.name}</h1>
                {isArtist && (
                  <span className="bg-purple-100 text-purple-700 text-xs px-3 py-1 rounded-full font-medium">
                    Artist
                  </span>
                )}
              </div>
              {user.bio && (
                <p className="text-lg text-gray-700 mb-4 max-w-2xl">
                  {user.bio}
                </p>
              )}
              <div className="flex items-center gap-6 text-sm text-gray-600 pt-4 border-t border-gray-200">
                <span>{publicPhotos.length} photos contributed</span>
                <span>{collections.length} public collections</span>
                {isArtist && (
                  <span>{claimedArtworks.length} artworks claimed</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Artist's Claimed Artworks Section */}
        {isArtist && claimedArtworks.length > 0 && (
          <section className="mb-16">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              {user.name}'s Artworks
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {claimedArtworks.map((artwork: any) => (
                <a
                  key={artwork.id}
                  href={`/artwork/${artwork.id}`}
                  className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition"
                >
                  {artwork.photos?.[0] ? (
                    <div className="aspect-square bg-gray-100 overflow-hidden">
                      <img
                        src={artwork.photos[0].photoUrl}
                        alt={artwork.title}
                        className="w-full h-full object-cover hover:scale-105 transition"
                      />
                    </div>
                  ) : (
                    <div className="aspect-square bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                      <svg
                        className="w-12 h-12 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                        />
                      </svg>
                    </div>
                  )}
                  <div className="p-4">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {artwork.title}
                    </h3>
                    {artwork.description && (
                      <p className="text-sm text-gray-600 line-clamp-2">
                        {artwork.description}
                      </p>
                    )}
                  </div>
                </a>
              ))}
            </div>
          </section>
        )}

        {/* Walls Section */}
        {collections.length > 0 && (
          <section className="mb-16">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              Walls
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {collections.map((collection: any) => (
                <a
                  key={collection.id}
                  href={`/collection/${collection.id}`}
                  className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition"
                >
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {collection.name}
                  </h3>
                  {collection.description && (
                    <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                      {collection.description}
                    </p>
                  )}
                  <p className="text-sm text-gray-500">
                    {collection.items?.length || 0} artworks
                  </p>
                </a>
              ))}
            </div>
          </section>
        )}

        {/* Public Photos Section */}
        {publicPhotos.length > 0 && (
          <section className="mb-16">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              Photo Contributions
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {publicPhotos.map((photo: any) => (
                <div
                  key={photo.id}
                  className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition"
                >
                  <a
                    href={photo.artwork ? `/artwork/${photo.artwork.id}` : "#"}
                    className="aspect-square bg-gray-100 overflow-hidden block"
                  >
                    <img
                      src={photo.photoUrl}
                      alt="Photo"
                      className="w-full h-full object-cover hover:scale-105 transition"
                    />
                  </a>
                  <div className="p-4">
                    {photo.artwork && (
                      <a
                        href={`/artwork/${photo.artwork.id}`}
                        className="text-sm font-medium text-gray-900 hover:text-blue-600"
                      >
                        {photo.artwork.title}
                      </a>
                    )}
                    <p className="text-xs text-gray-500 mt-2">
                      {new Date(photo.uploadedAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Empty State */}
        {!isArtist && collections.length === 0 && publicPhotos.length === 0 && (
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
            <p className="text-gray-500">
              This user hasn't shared any walls or photos yet.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
