import { redirect, useRouteLoaderData, Form, useActionData } from "react-router";
import type { Route } from "./+types/user.profile";
import { Header } from "~/components/Header";
import { Button } from "~/components/ui/Button";
import { useState, useEffect } from "react";
import { useTheme } from "~/lib/useTheme";
import { useDebounce } from "~/lib/useDebounce";

type LoaderData = {
  user: {
    id: string;
    email: string;
    name?: string;
    role?: string;
  };
  userDetails: {
    avatarUrl?: string;
    bio?: string;
    role?: string;
    artistName?: string;
    artistWebsite?: string;
    artistEmail?: string;
    artistInstagram?: string;
    artistTwitter?: string;
    artistBio?: string;
  };
  allPhotos: any[];
  collections: any[];
};

export const loader: Route.LoaderFunction = async ({ request }) => {
  const { getAuthTokenFromCookie, getUserFromToken } = await import("~/lib/auth.server");
  const { getPhotosByUser } = await import("~/lib/photos.server");
  const { getUserCollections } = await import("~/lib/collections.server");
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
        role: true,
        artistName: true,
        artistWebsite: true,
        artistEmail: true,
        artistInstagram: true,
        artistTwitter: true,
        artistBio: true,
      },
    });

    const [allPhotos, collections] = await Promise.all([
      getPhotosByUser(user.id),
      getUserCollections(user.id),
    ]);

    return {
      user: { ...user, role: userDetails?.role },
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
  const { prismaClient } = await import("~/lib/db.server");
  const { ensureArtistExists } = await import("~/lib/curation.server");

  const cookieHeader = request.headers.get("cookie");
  const token = getAuthTokenFromCookie(cookieHeader);
  const user = getUserFromToken(token);

  if (!user) {
    return redirect("/auth/login");
  }

  if (request.method === "POST") {
    const formData = await request.formData();
    const action = formData.get("_action");

    if (action === "become-artist") {
      try {
        const artistName = formData.get("artistName") as string;
        const artistWebsite = formData.get("artistWebsite") as string;
        const artistEmail = formData.get("artistEmail") as string;
        const artistInstagram = formData.get("artistInstagram") as string;
        const artistTwitter = formData.get("artistTwitter") as string;
        const artistBio = formData.get("artistBio") as string;

        const prisma = await prismaClient();
        await prisma.user.update({
          where: { id: user.id },
          data: {
            role: "ARTIST",
            artistName: artistName || null,
            artistWebsite: artistWebsite || null,
            artistEmail: artistEmail || null,
            artistInstagram: artistInstagram || null,
            artistTwitter: artistTwitter || null,
            artistBio: artistBio || null,
          },
        });

        // Register the artist in the browse system when they become an artist
        if (artistName) {
          await ensureArtistExists(artistName);
        }

        return { success: true, message: "You're now an artist!" };
      } catch (error) {
        return {
          error: error instanceof Error ? error.message : "Failed to become an artist",
        };
      }
    }

    if (action === "update-artist-info") {
      try {
        const artistName = formData.get("artistName") as string;
        const artistWebsite = formData.get("artistWebsite") as string;
        const artistEmail = formData.get("artistEmail") as string;
        const artistInstagram = formData.get("artistInstagram") as string;
        const artistTwitter = formData.get("artistTwitter") as string;
        const artistBio = formData.get("artistBio") as string;

        const prisma = await prismaClient();

        // Get current artist name to check if it changed
        const currentUser = await prisma.user.findUnique({
          where: { id: user.id },
          select: { artistName: true },
        });

        await prisma.user.update({
          where: { id: user.id },
          data: {
            artistName: artistName || null,
            artistWebsite: artistWebsite || null,
            artistEmail: artistEmail || null,
            artistInstagram: artistInstagram || null,
            artistTwitter: artistTwitter || null,
            artistBio: artistBio || null,
          },
        });

        // Register the updated artist name in the browse system if changed
        if (artistName && artistName !== currentUser?.artistName) {
          await ensureArtistExists(artistName);
        }

        return { success: true, message: "Artist information updated!" };
      } catch (error) {
        return {
          error: error instanceof Error ? error.message : "Failed to update artist information",
        };
      }
    }

    if (action === "toggle-privacy") {
      const photoId = formData.get("photoId") as string;
      const currentPrivate = formData.get("isPrivate") === "true";
      const artworkId = formData.get("artworkId") as string;

      try {
        if (currentPrivate && !artworkId) {
          return { error: "Please select an artwork to associate with this photo" };
        }

        const updateData: any = { isPrivate: !currentPrivate };
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

function PhotoCard({ photo, onMakePublic, onDelete }: any) {
  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition">
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
        <div className="flex gap-2">
          {onMakePublic ? (
            onMakePublic(photo)
          ) : (
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
  );
}

export default function UserDashboardPage() {
  const rootData = useRouteLoaderData("root") as any;
  const { scheme, noiseColor } = useTheme();
  const loaderData = useRouteLoaderData("routes/user.profile") as LoaderData;
  const actionData = useActionData() as any;
  const { user, userDetails, allPhotos, collections } = loaderData;
  const [isBecomingArtist, setIsBecomingArtist] = useState(false);
  const [isEditingArtistInfo, setIsEditingArtistInfo] = useState(false);

  const [selectedPhotoForPublishing, setSelectedPhotoForPublishing] = useState<string | null>(null);
  const [searchArtwork, setSearchArtwork] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedArtwork, setSelectedArtwork] = useState<any | null>(null);

  const debouncedSearchQuery = useDebounce(searchArtwork, 300);

  const privatePhotos = allPhotos.filter((p: any) => p.isPrivate);
  const publicPhotos = allPhotos.filter((p: any) => !p.isPrivate);

  // Group photos by artwork
  const groupPhotosByArtwork = (photos: any[]) => {
    const grouped: { [key: string]: any[] } = {};
    const unlinked: any[] = [];

    photos.forEach((photo) => {
      if (photo.artwork) {
        const artworkId = photo.artwork.id;
        if (!grouped[artworkId]) {
          grouped[artworkId] = [];
        }
        grouped[artworkId].push(photo);
      } else {
        unlinked.push(photo);
      }
    });

    return { grouped, unlinked };
  };

  const { grouped: groupedPrivate, unlinked: unlinkedPrivate } = groupPhotosByArtwork(privatePhotos);
  const { grouped: groupedPublic, unlinked: unlinkedPublic } = groupPhotosByArtwork(publicPhotos);

  useEffect(() => {
    if (actionData?.success && selectedPhotoForPublishing) {
      setTimeout(() => {
        window.location.href = window.location.href;
      }, 500);
    }
  }, [actionData?.success, selectedPhotoForPublishing]);

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
            <div className="flex-1">
              <h1 className="text-4xl font-bold text-gray-900 mb-2">
                {user.name || "User Profile"}
              </h1>
              <div className="flex items-center gap-4 mb-4">
                <p className="text-gray-600">{user.email}</p>
                {userDetails?.role === "ARTIST" && (
                  <span className="px-3 py-1 bg-blue-100 text-blue-700 text-sm font-semibold rounded-full">
                    Artist
                  </span>
                )}
              </div>
              {userDetails?.bio && (
                <p className="text-gray-700 max-w-2xl">{userDetails.bio}</p>
              )}

              {/* Become Artist Section */}
              {userDetails?.role !== "ARTIST" && !isBecomingArtist && (
                <div className="mt-4">
                  <button
                    onClick={() => setIsBecomingArtist(true)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
                  >
                    Become an Artist
                  </button>
                </div>
              )}

              {/* Artist Info Section */}
              {userDetails?.role === "ARTIST" && !isEditingArtistInfo && (
                <div className="mt-4 p-4 rounded-lg border-l-4 border-blue-500 bg-blue-50">
                  <p className="font-semibold text-blue-900 mb-2">Artist Profile</p>
                  {userDetails?.artistName && (
                    <p className="text-sm text-blue-800">
                      <span className="font-medium">Name:</span> {userDetails.artistName}
                    </p>
                  )}
                  {userDetails?.artistEmail && (
                    <p className="text-sm text-blue-800">
                      <span className="font-medium">Email:</span> {userDetails.artistEmail}
                    </p>
                  )}
                  {userDetails?.artistInstagram && (
                    <p className="text-sm text-blue-800">
                      <span className="font-medium">Instagram:</span> @{userDetails.artistInstagram}
                    </p>
                  )}
                  {userDetails?.artistTwitter && (
                    <p className="text-sm text-blue-800">
                      <span className="font-medium">Twitter:</span> @{userDetails.artistTwitter}
                    </p>
                  )}
                  {userDetails?.artistWebsite && (
                    <p className="text-sm text-blue-800">
                      <span className="font-medium">Website:</span>{" "}
                      <a href={userDetails.artistWebsite} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                        {userDetails.artistWebsite}
                      </a>
                    </p>
                  )}
                  <button
                    onClick={() => setIsEditingArtistInfo(true)}
                    className="mt-3 text-sm text-blue-700 hover:text-blue-900 font-medium underline"
                  >
                    Edit Artist Info
                  </button>
                </div>
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
              My Walls ({collections.length})
            </a>
          </div>
        </div>

        {/* Photos Section */}
        <section id="photos" className="mb-16">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">My Photos</h2>
            <p className="text-gray-600">Manage your uploaded photos and control their visibility</p>
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
            <div className="space-y-10">
              {/* Private Photos */}
              {privatePhotos.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
                    <span className="inline-block w-3 h-3 bg-yellow-500 rounded-full"></span>
                    Private Photos ({privatePhotos.length})
                  </h3>

                  <div className="space-y-8">
                    {/* Unlinked Private Photos */}
                    {unlinkedPrivate.length > 0 && (
                      <div>
                        <h4 className="text-sm font-semibold text-gray-700 mb-4 italic">
                          Not linked to artwork
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                          {unlinkedPrivate.map((photo: any) => (
                            <PhotoCard
                              key={photo.id}
                              photo={photo}
                              onMakePublic={(photo: any) => (
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
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Grouped by Artwork */}
                    {Object.entries(groupedPrivate).map(([artworkId, photos]: [string, any[]]) => {
                      const artwork = photos[0]?.artwork;
                      return (
                        <div key={artworkId}>
                          <h4 className="text-sm font-semibold text-gray-700 mb-4">
                            {artwork?.title || "Unknown Artwork"}
                          </h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {photos.map((photo: any) => (
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
                                  <div className="flex gap-2">
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
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Public Photos */}
              {publicPhotos.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
                    <span className="inline-block w-3 h-3 bg-green-500 rounded-full"></span>
                    Public Photos ({publicPhotos.length})
                  </h3>

                  <div className="space-y-8">
                    {/* Unlinked Public Photos */}
                    {unlinkedPublic.length > 0 && (
                      <div>
                        <h4 className="text-sm font-semibold text-gray-700 mb-4 italic">
                          Not linked to artwork
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                          {unlinkedPublic.map((photo: any) => (
                            <PhotoCard key={photo.id} photo={photo} />
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Grouped by Artwork */}
                    {Object.entries(groupedPublic).map(([artworkId, photos]: [string, any[]]) => {
                      const artwork = photos[0]?.artwork;
                      return (
                        <div key={artworkId}>
                          <h4 className="text-sm font-semibold text-gray-700 mb-4">
                            <a
                              href={`/artwork/${artworkId}`}
                              className="text-blue-600 hover:text-blue-700"
                            >
                              {artwork?.title || "Unknown Artwork"}
                            </a>
                          </h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {photos.map((photo: any) => (
                              <PhotoCard key={photo.id} photo={photo} />
                            ))}
                          </div>
                        </div>
                      );
                    })}
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
              <h2 className="text-2xl font-bold text-gray-900 mb-2">My Walls</h2>
              <p className="text-gray-600">Create and manage curated walls of artworks</p>
            </div>
            <a
              href="/collection/new"
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
            >
              + New Wall
            </a>
          </div>

          {collections.length === 0 ? (
            <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
              <p className="text-gray-500 mb-4">You haven't created any walls yet.</p>
              <a
                href="/collection/new"
                className="inline-block bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
              >
                Create Your First Wall
              </a>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {collections.map((collection: any) => (
                <div
                  key={collection.id}
                  className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition"
                >
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{collection.name}</h3>
                  {collection.description && (
                    <p className="text-sm text-gray-600 mb-4">{collection.description}</p>
                  )}
                  <p className="text-sm text-gray-500 mb-4">
                    {collection.items?.length || 0} artworks
                  </p>
                  <div className="flex items-center gap-2 mb-4">
                    <span
                      className={`text-xs px-2 py-1 rounded ${
                        collection.isPublic ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"
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

        {/* Modal for Becoming an Artist */}
        {isBecomingArtist && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={() => setIsBecomingArtist(false)}
          >
            <div
              className="bg-white rounded-lg shadow-xl max-w-2xl w-full overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-6">
                <h2 className="text-2xl font-bold text-white">Become an Artist</h2>
                <p className="text-blue-100 text-sm mt-1">
                  Provide your contact information so admins can reach you about your artwork claims.
                </p>
              </div>

              {actionData?.success && (
                <div className="bg-green-50 border-l-4 border-green-500 p-4 m-6">
                  <p className="text-green-800 font-medium">{actionData.message}</p>
                </div>
              )}

              {actionData?.error && (
                <div className="bg-red-50 border-l-4 border-red-500 p-4 m-6">
                  <p className="text-red-800 font-medium">{actionData.error}</p>
                </div>
              )}

              <Form method="post" className="p-6 space-y-4">
                <input type="hidden" name="_action" value="become-artist" />

                <div>
                  <label htmlFor="artistName" className="block text-sm font-medium text-gray-900 mb-2">
                    Artist Name (optional)
                  </label>
                  <input
                    type="text"
                    id="artistName"
                    name="artistName"
                    placeholder="Your artist name or stage name"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                <div>
                  <label htmlFor="artistEmail" className="block text-sm font-medium text-gray-900 mb-2">
                    Contact Email (optional)
                  </label>
                  <input
                    type="email"
                    id="artistEmail"
                    name="artistEmail"
                    placeholder="your.email@example.com"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                <div>
                  <label htmlFor="artistInstagram" className="block text-sm font-medium text-gray-900 mb-2">
                    Instagram Handle (optional)
                  </label>
                  <input
                    type="text"
                    id="artistInstagram"
                    name="artistInstagram"
                    placeholder="your_instagram_handle"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                <div>
                  <label htmlFor="artistTwitter" className="block text-sm font-medium text-gray-900 mb-2">
                    Twitter Handle (optional)
                  </label>
                  <input
                    type="text"
                    id="artistTwitter"
                    name="artistTwitter"
                    placeholder="your_twitter_handle"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                <div>
                  <label htmlFor="artistWebsite" className="block text-sm font-medium text-gray-900 mb-2">
                    Website or Portfolio (optional)
                  </label>
                  <input
                    type="url"
                    id="artistWebsite"
                    name="artistWebsite"
                    placeholder="https://yourwebsite.com"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                <div>
                  <label htmlFor="artistBio" className="block text-sm font-medium text-gray-900 mb-2">
                    Bio (optional)
                  </label>
                  <textarea
                    id="artistBio"
                    name="artistBio"
                    placeholder="Tell us about your art..."
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                <div className="bg-gray-50 px-6 py-4 -mx-6 -mb-6 flex gap-3 justify-end">
                  <button
                    type="button"
                    onClick={() => setIsBecomingArtist(false)}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
                  >
                    Become an Artist
                  </button>
                </div>
              </Form>
            </div>
          </div>
        )}

        {/* Modal for Editing Artist Info */}
        {isEditingArtistInfo && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={() => setIsEditingArtistInfo(false)}
          >
            <div
              className="bg-white rounded-lg shadow-xl max-w-2xl w-full overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-6">
                <h2 className="text-2xl font-bold text-white">Edit Artist Information</h2>
                <p className="text-blue-100 text-sm mt-1">
                  Update your contact information so admins can reach you.
                </p>
              </div>

              {actionData?.success && (
                <div className="bg-green-50 border-l-4 border-green-500 p-4 m-6">
                  <p className="text-green-800 font-medium">{actionData.message}</p>
                </div>
              )}

              {actionData?.error && (
                <div className="bg-red-50 border-l-4 border-red-500 p-4 m-6">
                  <p className="text-red-800 font-medium">{actionData.error}</p>
                </div>
              )}

              <Form method="post" className="p-6 space-y-4">
                <input type="hidden" name="_action" value="update-artist-info" />

                <div>
                  <label htmlFor="artistName" className="block text-sm font-medium text-gray-900 mb-2">
                    Artist Name
                  </label>
                  <input
                    type="text"
                    id="artistName"
                    name="artistName"
                    defaultValue={userDetails?.artistName || ""}
                    placeholder="Your artist name or stage name"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                <div>
                  <label htmlFor="artistEmail" className="block text-sm font-medium text-gray-900 mb-2">
                    Contact Email
                  </label>
                  <input
                    type="email"
                    id="artistEmail"
                    name="artistEmail"
                    defaultValue={userDetails?.artistEmail || ""}
                    placeholder="your.email@example.com"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                <div>
                  <label htmlFor="artistInstagram" className="block text-sm font-medium text-gray-900 mb-2">
                    Instagram Handle
                  </label>
                  <input
                    type="text"
                    id="artistInstagram"
                    name="artistInstagram"
                    defaultValue={userDetails?.artistInstagram || ""}
                    placeholder="your_instagram_handle"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                <div>
                  <label htmlFor="artistTwitter" className="block text-sm font-medium text-gray-900 mb-2">
                    Twitter Handle
                  </label>
                  <input
                    type="text"
                    id="artistTwitter"
                    name="artistTwitter"
                    defaultValue={userDetails?.artistTwitter || ""}
                    placeholder="your_twitter_handle"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                <div>
                  <label htmlFor="artistWebsite" className="block text-sm font-medium text-gray-900 mb-2">
                    Website or Portfolio
                  </label>
                  <input
                    type="url"
                    id="artistWebsite"
                    name="artistWebsite"
                    defaultValue={userDetails?.artistWebsite || ""}
                    placeholder="https://yourwebsite.com"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                <div>
                  <label htmlFor="artistBio" className="block text-sm font-medium text-gray-900 mb-2">
                    Bio
                  </label>
                  <textarea
                    id="artistBio"
                    name="artistBio"
                    defaultValue={userDetails?.artistBio || ""}
                    placeholder="Tell us about your art..."
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                <div className="bg-gray-50 px-6 py-4 -mx-6 -mb-6 flex gap-3 justify-end">
                  <button
                    type="button"
                    onClick={() => setIsEditingArtistInfo(false)}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
                  >
                    Save Changes
                  </button>
                </div>
              </Form>
            </div>
          </div>
        )}

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

              <div className="p-6 border-b">
                <input
                  type="text"
                  placeholder="Search artworks by title..."
                  value={searchArtwork}
                  onChange={(e) => setSearchArtwork(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

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
                  <p className="text-gray-500 text-center">Start typing to search for artworks</p>
                ) : (
                  <p className="text-gray-500 text-center">No artworks found</p>
                )}
              </div>

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
