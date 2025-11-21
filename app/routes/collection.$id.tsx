import { redirect, useRouteLoaderData, Form } from "react-router";
import type { Route } from "./+types/collection.$id";
import { Header } from "~/components/Header";
import { useTheme } from "~/lib/useTheme";

type LoaderData = {
  user?: {
    id: string;
    email: string;
    name?: string;
  };
  collection: any;
  isOwner: boolean;
};

export const loader: Route.LoaderFunction = async ({ params, request }) => {
  const { getAuthTokenFromCookie, getUserFromToken } = await import("~/lib/auth.server");
  const { getCollection } = await import("~/lib/collections.server");

  const { id } = params;

  if (!id) {
    throw new Error("Collection ID is required");
  }

  try {
    const collection = await getCollection(id);

    if (!collection) {
      throw new Response("Collection not found", { status: 404 });
    }

    const cookieHeader = request.headers.get("cookie");
    const token = cookieHeader ? getAuthTokenFromCookie(cookieHeader) : null;
    const user = token ? getUserFromToken(token) : null;

    const isOwner = user?.id === collection.userId;

    if (!collection.isPublic && !isOwner) {
      throw new Response("This collection is private", { status: 403 });
    }

    return {
      user,
      collection,
      isOwner,
      currentUserId: user?.id,
    };
  } catch (error) {
    console.error("[COLLECTION] Error loading collection:", error);
    throw error;
  }
};

export const action: Route.ActionFunction = async ({ request, params }) => {
  const { getAuthTokenFromCookie, getUserFromToken } = await import("~/lib/auth.server");
  const { getCollection, removeArtworkFromCollection } = await import("~/lib/collections.server");

  const cookieHeader = request.headers.get("cookie");
  const token = getAuthTokenFromCookie(cookieHeader);
  const user = getUserFromToken(token);
  const { id } = params;

  if (!user) {
    return redirect("/auth/login");
  }

  const collection = await getCollection(id!);
  if (!collection || collection.userId !== user.id) {
    return { error: "Unauthorized" };
  }

  if (request.method === "POST") {
    const formData = await request.formData();
    const action = formData.get("_action");

    if (action === "remove-artwork") {
      const artworkId = formData.get("artworkId") as string;

      try {
        await removeArtworkFromCollection(id!, artworkId);
        return { success: true };
      } catch (error) {
        console.error("[COLLECTION] Error removing artwork:", error);
        return { error: "Failed to remove artwork" };
      }
    }
  }

  return null;
};

export default function CollectionPage() {
  const rootData = useRouteLoaderData("root") as any;
  const loaderData = useRouteLoaderData("routes/collection.$id") as LoaderData & { currentUserId?: string };
  const { collection, isOwner, currentUserId } = loaderData;
  const { scheme, noiseColor } = useTheme();

  if (!collection) {
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
            <h1 className="text-2xl font-bold mb-4">
              Wall Not Found
            </h1>
            <a href="/" className="font-medium hover:opacity-80" style={{ color: scheme.accent }}>
              ← Back to Home
            </a>
          </div>
        </main>
      </div>
    );
  }

  const items = collection.items || [];

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
        {/* Back Button */}
        <div className="mb-8">
          <a
            href={isOwner ? "/user/profile" : "/"}
            className="text-blue-600 hover:text-blue-700 font-medium flex items-center gap-2"
          >
            ← Back
          </a>
        </div>

        {/* Header */}
        <div className="mb-12">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">
                {collection.name}
              </h1>
              {collection.description && (
                <p className="text-lg text-gray-600 mb-4">
                  {collection.description}
                </p>
              )}
              <div className="flex items-center gap-4">
                <span
                  className={`text-xs px-3 py-1 rounded ${
                    collection.isPublic
                      ? "bg-green-100 text-green-700"
                      : "bg-gray-100 text-gray-700"
                  }`}
                >
                  {collection.isPublic ? "Public" : "Private"}
                </span>
                <span className="text-sm text-gray-500">
                  {items.length} {items.length === 1 ? "artwork" : "artworks"}
                </span>
              </div>
            </div>
            {isOwner && (
              <a
                href={`/collection/${collection.id}/edit`}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
              >
                Edit Wall
              </a>
            )}
          </div>

          {/* Creator Info */}
          <div className="flex items-center gap-3 mt-6 pt-6 border-t border-gray-200">
            {collection.user?.avatarUrl && (
              <img
                src={collection.user.avatarUrl}
                alt={collection.user.name}
                className="w-12 h-12 rounded-full object-cover"
              />
            )}
            <div>
              <p className="text-sm font-medium text-gray-900">
                {collection.user?.name || collection.user?.id}
              </p>
              <p className="text-xs text-gray-500">Wall curator</p>
            </div>
          </div>
        </div>

        {/* Artworks Grid */}
        {items.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
            <p className="text-gray-500 mb-4">
              This wall doesn't have any artworks yet.
            </p>
            {isOwner && (
              <p className="text-sm text-gray-600">
                Add artworks by visiting artwork pages and adding them to this wall.
              </p>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {items.map((item: any) => {
              const artwork = item.artwork;
              const primaryPhoto = artwork.photos?.[0];

              return (
                <div
                  key={item.id}
                  className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition"
                >
                  {/* Image */}
                  {primaryPhoto ? (
                    <div className="aspect-square bg-gray-100 overflow-hidden">
                      <img
                        src={primaryPhoto.photoUrl}
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

                  {/* Content */}
                  <div className="p-4">
                    <a
                      href={`/artwork/${artwork.id}`}
                      className="text-lg font-semibold text-gray-900 hover:text-blue-600 transition"
                    >
                      {artwork.title}
                    </a>
                    {artwork.description && (
                      <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                        {artwork.description}
                      </p>
                    )}

                    {/* Status Badge */}
                    {(() => {
                      const isClaimMaker = currentUserId === artwork.artistId && artwork.claimStatus === "PENDING_APPROVAL";
                      const displayStatus = isClaimMaker ? artwork.claimStatus : (artwork.claimStatus === "PENDING_APPROVAL" ? "UNCLAIMED" : artwork.claimStatus);

                      return (
                        <div className="mt-3 mb-3">
                          <span
                            className={`text-xs px-2 py-1 rounded ${
                              displayStatus === "CLAIMED"
                                ? "bg-green-100 text-green-700"
                                : displayStatus === "PENDING_APPROVAL"
                                ? "bg-yellow-100 text-yellow-700"
                                : "bg-gray-100 text-gray-700"
                            }`}
                          >
                            {displayStatus === "CLAIMED"
                              ? "Claimed by Artist"
                              : displayStatus === "PENDING_APPROVAL"
                              ? "Pending Approval"
                              : "Unclaimed"}
                          </span>
                        </div>
                      );
                    })()}

                    {/* Actions */}
                    {isOwner ? (
                      <Form method="post">
                        <input type="hidden" name="_action" value="remove-artwork" />
                        <input type="hidden" name="artworkId" value={artwork.id} />
                        <button
                          type="submit"
                          className="w-full text-sm bg-red-100 text-red-700 px-3 py-2 rounded hover:bg-red-200 transition"
                        >
                          Remove from Collection
                        </button>
                      </Form>
                    ) : (
                      <a
                        href={`/artwork/${artwork.id}`}
                        className="w-full block text-center text-sm bg-blue-100 text-blue-700 px-3 py-2 rounded hover:bg-blue-200 transition"
                      >
                        View Artwork
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
