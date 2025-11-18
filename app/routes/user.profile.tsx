import { redirect, useRouteLoaderData, Form, useActionData } from "react-router";
import type { Route } from "./+types/user.profile";
import { Navigation } from "~/components/Navigation";
import { Button } from "~/components/ui/Button";
import { useState, useEffect } from "react";
import { useDebounce } from "~/lib/useDebounce";

type LoaderData = {
  user: {
    id: string;
    email: string;
    name?: string;
  };
  userDetails: {
    avatarUrl?: string;
    bio?: string;
  };
  allPhotos: any[];
  collections: any[];
};

export const loader: Route.LoaderFunction = async ({ request }) => {
  const { getAuthTokenFromCookie, getUserFromToken } = await import("~/lib/auth.server");
  const { getPhotosByUser, updatePhoto, deletePhoto } = await import("~/lib/photos.server");
  const { getUserCollections, deleteCollection } = await import("~/lib/collections.server");
  const { prismaClient } = await import("~/lib/db.server");

  const cookieHeader = request.headers.get("cookie");
  const token = getAuthTokenFromCookie(cookieHeader);
  const user = getUserFromToken(token);

  if (!user) {
    return redirect("/auth/login");
  }

  try {
    const prisma = await prismaClient();
    const userDetails = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        avatarUrl: true,
        bio: true,
      },
    });

    const [allPhotos, collections] = await Promise.all([
      getPhotosByUser(user.id),
      getUserCollections(user.id),
    ]);

    return {
      user,
      userDetails: userDetails || {},
      allPhotos,
      collections,
    };
  } catch (error) {
    console.error("[USER DASHBOARD] Error loading data:", error);
    throw error;
  }
};

export const action: Route.ActionFunction = async ({ request }) => {
  const { getAuthTokenFromCookie, getUserFromToken } = await import("~/lib/auth.server");
  const { updatePhoto, deletePhoto } = await import("~/lib/photos.server");
  const { deleteCollection } = await import("~/lib/collections.server");

  const cookieHeader = request.headers.get("cookie");
  const token = getAuthTokenFromCookie(cookieHeader);
  const user = getUserFromToken(token);

  if (!user) {
    return redirect("/auth/login");
  }

  if (request.method === "POST") {
    const formData = await request.formData();
    const action = formData.get("_action");

    if (action === "toggle-privacy") {
      const photoId = formData.get("photoId") as string;
      const currentPrivate = formData.get("isPrivate") === "true";
      const artworkId = formData.get("artworkId") as string;

      try {
        // If making a private photo public, require artwork selection
        if (currentPrivate && !artworkId) {
          return { error: "Please select an artwork to associate with this photo" };
        }

        // Update photo: toggle privacy and set/keep artwork association
        const updateData: any = { isPrivate: !currentPrivate };

        // When making private (currentPrivate=false, toggling to true), keep the artwork
        // When making public (currentPrivate=true, toggling to false), set the artwork
        if (artworkId) {
          updateData.artworkId = artworkId;
        }

        await updatePhoto(photoId, updateData);
        return { success: true };
      } catch (error) {
        console.error("[DASHBOARD] Error updating photo privacy:", error);
        return { error: "Failed to update photo privacy" };
      }
    }

    if (action === "delete-photo") {
      const photoId = formData.get("photoId") as string;

      try {
        await deletePhoto(photoId);
        return { success: true };
      } catch (error) {
        console.error("[DASHBOARD] Error deleting photo:", error);
        return { error: "Failed to delete photo" };
      }
    }

    if (action === "delete-collection") {
      const collectionId = formData.get("collectionId") as string;

      try {
        await deleteCollection(collectionId);
        return { success: true };
      } catch (error) {
        console.error("[DASHBOARD] Error deleting collection:", error);
        return { error: "Failed to delete collection" };
      }
    }
  }

  return null;
};

export default function UserDashboardPage() {
  const rootData = useRouteLoaderData("root") as any;
  const loaderData = useRouteLoaderData("routes/user.profile") as LoaderData;
  const actionData = useActionData() as any;
  const { user, userDetails, allPhotos, collections } = loaderData;

  const [selectedPhotoForPublishing, setSelectedPhotoForPublishing] = useState<string | null>(null);
  const [searchArtwork, setSearchArtwork] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedArtwork, setSelectedArtwork] = useState<any | null>(null);

  // Debounce search input to avoid rapid requests while typing
  const debouncedSearchQuery = useDebounce(searchArtwork, 300);

  const privatePhotos = allPhotos.filter((p: any) => p.isPrivate);
  const publicPhotos = allPhotos.filter((p: any) => !p.isPrivate);

  // Reload page when toggle-privacy action succeeds
  useEffect(() => {
    if (actionData?.success && selectedPhotoForPublishing) {
      // Reload page to refresh photo list and reset state
      setTimeout(() => {
        window.location.href = window.location.href;
      }, 500);
    }
  }, [actionData?.success, selectedPhotoForPublishing]);

  // Perform search when debounced query changes
  useEffect(() => {
    if (debouncedSearchQuery.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    const performSearch = async () => {
      setIsSearching(true);
      try {
        const response = await fetch(
          `/api/artworks/search?q=${encodeURIComponent(debouncedSearchQuery)}`
        );
        const data = await response.json();
        setSearchResults(data.artworks || []);
      } catch (error) {
        console.error("Error searching artworks:", error);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    };

    performSearch();
  }, [debouncedSearchQuery]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation user={rootData?.user} />

      <main className="max-w-6xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="mb-12">
          <div className="flex items-start gap-6 mb-8">
            {userDetails?.avatarUrl && (
              <img
                src={userDetails.avatarUrl}
                alt={user.name}
                className="w-24 h-24 rounded-full object-cover"
              />
            )}
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">
                {user.name || "User Profile"}
              </h1>
              <p className="text-gray-600 mb-4">{user.email}</p>
              {userDetails?.bio && (
                <p className="text-gray-700 max-w-2xl">{userDetails.bio}</p>
              )}
            </div>
          </div>
        </div>

        {/* Tabs Navigation */}
        <div className="border-b border-gray-200 mb-8">
          <div className="flex gap-8">
            <a
              href="#photos"
              className="py-4 px-1 border-b-2 border-blue-600 text-blue-600 font-medium"
            >
              My Photos ({allPhotos.length})
            </a>
            <a
              href="#collections"
              className="py-4 px-1 border-b border-gray-200 text-gray-600 hover:text-gray-900"
            >
              My Collections ({collections.length})
            </a>
          </div>
        </div>

        {/* Photos Section */}
        <section id="photos" className="mb-16">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              My Photos
            </h2>
            <p className="text-gray-600">
              Manage your uploaded photos and control their visibility
            </p>
          </div>

          {allPhotos.length === 0 ? (
            <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
              <p className="text-gray-500">
                You haven't uploaded any photos yet.{" "}
                <a href="/artwork/upload" className="text-blue-600 hover:text-blue-700 font-medium">
                  Upload your first photo
                </a>
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Private Photos */}
              {privatePhotos.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <span className="inline-block w-3 h-3 bg-yellow-500 rounded-full"></span>
                    Private Photos ({privatePhotos.length})
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {privatePhotos.map((photo: any) => (
                      <div
                        key={photo.id}
                        className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition"
                      >
                        <div className="aspect-square bg-gray-100 overflow-hidden">
                          <img
                            src={photo.photoUrl}
                            alt="Photo"
                            className="w-full h-full object-cover hover:scale-105 transition"
                          />
                        </div>
                        <div className="p-4">
                          <p className="text-xs text-gray-500 mb-3">
                            Uploaded {new Date(photo.uploadedAt).toLocaleDateString()}
                          </p>
                          {photo.artwork && (
                            <p className="text-sm font-medium text-gray-900 mb-3">
                              {photo.artwork.title}
                            </p>
                          )}
                          <div className="flex gap-2">
                            {photo.artworkId ? (
                              // If already linked to artwork, toggle directly
                              <Form method="post" className="flex-1">
                                <input type="hidden" name="_action" value="toggle-privacy" />
                                <input type="hidden" name="photoId" value={photo.id} />
                                <input type="hidden" name="isPrivate" value="true" />
                                <input type="hidden" name="artworkId" value={photo.artworkId} />
                                <button
                                  type="submit"
                                  className="w-full text-sm bg-blue-600 text-white px-3 py-2 rounded hover:bg-blue-700 transition"
                                >
                                  Make Public
                                </button>
                              </Form>
                            ) : (
                              // If not linked, show modal to select artwork
                              <button
                                onClick={() => {
                                  setSelectedPhotoForPublishing(photo.id);
                                  setSearchArtwork("");
                                  setSearchResults([]);
                                  setSelectedArtwork(null);
                                }}
                                className="flex-1 text-sm bg-blue-600 text-white px-3 py-2 rounded hover:bg-blue-700 transition"
                              >
                                Make Public
                              </button>
                            )}
                            <Form method="post" className="flex-1">
                              <input type="hidden" name="_action" value="delete-photo" />
                              <input type="hidden" name="photoId" value={photo.id} />
                              <button
                                type="submit"
                                className="w-full text-sm bg-red-100 text-red-700 px-3 py-2 rounded hover:bg-red-200 transition"
                              >
                                Delete
                              </button>
                            </Form>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Public Photos */}
              {publicPhotos.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <span className="inline-block w-3 h-3 bg-green-500 rounded-full"></span>
                    Public Photos ({publicPhotos.length})
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {publicPhotos.map((photo: any) => (
                      <div
                        key={photo.id}
                        className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition"
                      >
                        <div className="aspect-square bg-gray-100 overflow-hidden">
                          <img
                            src={photo.photoUrl}
                            alt="Photo"
                            className="w-full h-full object-cover hover:scale-105 transition"
                          />
                        </div>
                        <div className="p-4">
                          <p className="text-xs text-gray-500 mb-3">
                            Uploaded {new Date(photo.uploadedAt).toLocaleDateString()}
                          </p>
                          {photo.artwork && (
                            <a
                              href={`/artwork/${photo.artwork.id}`}
                              className="text-sm font-medium text-gray-900 hover:text-blue-600 mb-3 block"
                            >
                              {photo.artwork.title}
                            </a>
                          )}
                          <div className="flex gap-2">
                            <Form method="post" className="flex-1">
                              <input type="hidden" name="_action" value="toggle-privacy" />
                              <input type="hidden" name="photoId" value={photo.id} />
                              <input type="hidden" name="isPrivate" value="false" />
                              {photo.artworkId && (
                                <input type="hidden" name="artworkId" value={photo.artworkId} />
                              )}
                              <button
                                type="submit"
                                className="w-full text-sm bg-gray-200 text-gray-700 px-3 py-2 rounded hover:bg-gray-300 transition"
                              >
                                Make Private
                              </button>
                            </Form>
                            <Form method="post" className="flex-1">
                              <input type="hidden" name="_action" value="delete-photo" />
                              <input type="hidden" name="photoId" value={photo.id} />
                              <button
                                type="submit"
                                className="w-full text-sm bg-red-100 text-red-700 px-3 py-2 rounded hover:bg-red-200 transition"
                              >
                                Delete
                              </button>
                            </Form>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </section>

        {/* Collections Section */}
        <section id="collections" className="mb-16">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                My Collections
              </h2>
              <p className="text-gray-600">
                Create and manage curated collections of artworks
              </p>
            </div>
            <a href="/collection/new" className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition">
              + New Collection
            </a>
          </div>

          {collections.length === 0 ? (
            <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
              <p className="text-gray-500 mb-4">
                You haven't created any collections yet.
              </p>
              <a
                href="/collection/new"
                className="inline-block bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
              >
                Create Your First Collection
              </a>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {collections.map((collection: any) => (
                <div
                  key={collection.id}
                  className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition"
                >
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {collection.name}
                  </h3>
                  {collection.description && (
                    <p className="text-sm text-gray-600 mb-4">
                      {collection.description}
                    </p>
                  )}
                  <p className="text-sm text-gray-500 mb-4">
                    {collection.items?.length || 0} artworks
                  </p>
                  <div className="flex items-center gap-2 mb-4">
                    <span
                      className={`text-xs px-2 py-1 rounded ${
                        collection.isPublic
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {collection.isPublic ? "Public" : "Private"}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <a
                      href={`/collection/${collection.id}`}
                      className="flex-1 text-center bg-blue-100 text-blue-700 px-3 py-2 rounded text-sm hover:bg-blue-200 transition"
                    >
                      View
                    </a>
                    <a
                      href={`/collection/${collection.id}/edit`}
                      className="flex-1 text-center bg-gray-200 text-gray-700 px-3 py-2 rounded text-sm hover:bg-gray-300 transition"
                    >
                      Edit
                    </a>
                    <Form method="post" className="flex-1">
                      <input type="hidden" name="_action" value="delete-collection" />
                      <input type="hidden" name="collectionId" value={collection.id} />
                      <button
                        type="submit"
                        className="w-full text-sm bg-red-100 text-red-700 px-3 py-2 rounded hover:bg-red-200 transition"
                        onClick={(e) => {
                          if (!confirm("Are you sure you want to delete this collection?")) {
                            e.preventDefault();
                          }
                        }}
                      >
                        Delete
                      </button>
                    </Form>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Modal for selecting artwork when making photo public */}
        {selectedPhotoForPublishing && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={() => {
              setSelectedPhotoForPublishing(null);
              setSelectedArtwork(null);
              setSearchArtwork("");
              setSearchResults([]);
            }}
          >
            <div
              className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-96 overflow-hidden flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="bg-gray-100 px-6 py-4 border-b flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Select Artwork</h2>
                  <p className="text-sm text-gray-600 mt-1">
                    Choose which artwork this photo belongs to
                  </p>
                </div>
                <button
                  onClick={() => {
                    setSelectedPhotoForPublishing(null);
                    setSelectedArtwork(null);
                    setSearchArtwork("");
                    setSearchResults([]);
                  }}
                  className="text-gray-400 hover:text-gray-600 transition text-2xl leading-none"
                  title="Close"
                >
                  ×
                </button>
              </div>

              {/* Search */}
              <div className="p-6 border-b">
                <input
                  type="text"
                  placeholder="Search artworks by title..."
                  value={searchArtwork}
                  onChange={(e) => setSearchArtwork(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              {/* Results */}
              <div className="flex-1 overflow-y-auto p-6">
                {isSearching ? (
                  <p className="text-gray-500 text-center">Searching...</p>
                ) : searchResults.length > 0 ? (
                  <div className="space-y-2">
                    {searchResults.map((artwork: any) => (
                      <button
                        key={artwork.id}
                        onClick={() => setSelectedArtwork(artwork)}
                        className={`w-full p-3 rounded-lg border-2 text-left transition ${
                          selectedArtwork?.id === artwork.id
                            ? "border-blue-600 bg-blue-50"
                            : "border-gray-200 hover:border-gray-300"
                        }`}
                      >
                        <p className="font-medium text-gray-900">{artwork.title}</p>
                        {artwork.description && (
                          <p className="text-sm text-gray-600 line-clamp-1">
                            {artwork.description}
                          </p>
                        )}
                      </button>
                    ))}
                  </div>
                ) : searchArtwork.trim().length === 0 ? (
                  <p className="text-gray-500 text-center">
                    Start typing to search for artworks
                  </p>
                ) : (
                  <p className="text-gray-500 text-center">
                    No artworks found
                  </p>
                )}
              </div>

              {/* Actions */}
              <div className="bg-gray-100 px-6 py-4 border-t flex gap-3 justify-end">
                <button
                  onClick={() => {
                    setSelectedPhotoForPublishing(null);
                    setSelectedArtwork(null);
                    setSearchArtwork("");
                    setSearchResults([]);
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                {selectedArtwork && (
                  <Form method="post">
                    <input type="hidden" name="_action" value="toggle-privacy" />
                    <input type="hidden" name="photoId" value={selectedPhotoForPublishing} />
                    <input type="hidden" name="isPrivate" value="true" />
                    <input type="hidden" name="artworkId" value={selectedArtwork.id} />
                    <button
                      type="submit"
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
                    >
                      Make Public
                    </button>
                  </Form>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
