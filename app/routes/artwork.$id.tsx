import { useParams, useRouteLoaderData, useFetcher, useNavigate, useRevalidator } from "react-router";
import { useState, useEffect } from "react";
import type { Route } from "./+types/artwork.$id";
import { Header } from "../components/Header";
import { Button } from "../components/ui/Button";
import { AddToWallButton } from "../components/AddToWallButton";
import { getArtwork, claimArtwork } from "../lib/artworks.server";
import { getPhotosByArtwork } from "../lib/photos.server";
import { getAuthTokenFromCookie, getUserFromToken } from "../lib/auth.server";
import { prismaClient } from "../lib/db.server";
import { useTheme } from "../lib/useTheme";

export const loader: Route.LoaderFunction = async ({ params, request }) => {
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

    // Get current user and their pending claims count
    const { getAuthTokenFromCookie, getUserFromToken } = await import("~/lib/auth.server");
    const { getPendingClaimsCount } = await import("~/lib/artworks.server");

    const cookieHeader = request.headers.get("cookie");
    const token = getAuthTokenFromCookie(cookieHeader);
    const user = getUserFromToken(token);

    let userPendingClaimsCount = 0;
    if (user) {
      userPendingClaimsCount = await getPendingClaimsCount(user.id);
    }

    return { artwork, photos, currentUser: user, userPendingClaimsCount };
  } catch (error) {
    console.error("[ARTWORK] Error loading artwork:", error);
    throw error;
  }
};

export const action: Route.ActionFunction = async ({ request, params }) => {
  if (request.method !== "POST") {
    return { error: "Method not allowed" };
  }

  const { id } = params;
  if (!id) {
    return { error: "Artwork ID is required" };
  }

  const cookieHeader = request.headers.get("cookie");
  const token = getAuthTokenFromCookie(cookieHeader);
  const user = getUserFromToken(token);

  if (!user) {
    return { error: "Unauthorized - please sign in" }, { status: 401 };
  }

  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "claim-artwork") {
    try {
      const prisma = await prismaClient();
      const { getPendingClaimsCount, isArtistInCooldown } = await import("~/lib/artworks.server");

      // Verify user has ARTIST role
      const userProfile = await prisma.user.findUnique({
        where: { id: user.id },
        select: { role: true },
      });

      if (!userProfile || userProfile.role !== "ARTIST") {
        return { error: "Only artists can claim artworks" }, { status: 403 };
      }

      // Check artwork exists and is unclaimed
      const artwork = await getArtwork(id);
      if (!artwork) {
        return { error: "Artwork not found" };
      }

      if (artwork.claimStatus !== "UNCLAIMED") {
        return {
          error: artwork.claimStatus === "CLAIMED"
            ? "This artwork has already been claimed"
            : "This artwork is pending approval"
        };
      }

      // Check if artist already has 3 pending claims
      const pendingCount = await getPendingClaimsCount(user.id);
      if (pendingCount >= 3) {
        return {
          error: "You already have 3 pending claims. Complete or withdraw one to make another claim.",
        };
      }

      // Check cooldown period (2 weeks since rejection)
      const inCooldown = await isArtistInCooldown(id, user.id);
      if (inCooldown) {
        return {
          error: "This artwork was recently rejected. Please wait 2 weeks before re-submitting your claim.",
        };
      }

      // Submit claim
      await claimArtwork(id, user.id);

      return { success: true, message: "Claim submitted for review" };
    } catch (error) {
      console.error("[CLAIM] Error submitting claim:", error);
      return {
        error: error instanceof Error ? error.message : "Failed to submit claim",
      };
    }
  }

  if (intent === "unclaim-artwork") {
    try {
      const { unclaimArtwork } = await import("~/lib/artworks.server");

      // Verify user is the one who made the claim
      const artwork = await getArtwork(id);
      if (!artwork) {
        return { error: "Artwork not found" };
      }

      if (artwork.claimStatus !== "PENDING_APPROVAL" || artwork.artistId !== user.id) {
        return { error: "You can only withdraw your own pending claims" }, { status: 403 };
      }

      // Withdraw claim
      await unclaimArtwork(id, user.id);

      return { success: true, message: "Claim withdrawn" };
    } catch (error) {
      console.error("[UNCLAIM] Error withdrawing claim:", error);
      return {
        error: error instanceof Error ? error.message : "Failed to withdraw claim",
      };
    }
  }

  if (intent === "update-metadata") {
    try {
      // Check artwork exists and is claimed by current user
      const artwork = await getArtwork(id);
      if (!artwork) {
        return { error: "Artwork not found" };
      }

      if (artwork.claimStatus !== "CLAIMED") {
        return { error: "Only claimed artworks can be edited" };
      }

      if (artwork.artistId !== user.id) {
        return { error: "You can only edit your own claimed artworks" }, { status: 403 };
      }

      // Get the updated fields
      const title = formData.get("title") as string;
      const yearCreated = formData.get("year") as string;
      const description = formData.get("description") as string;
      const address = formData.get("address") as string;

      // Validate inputs
      if (!title || title.trim() === "") {
        return { error: "Title is required" };
      }

      const year = yearCreated ? parseInt(yearCreated, 10) : null;
      if (yearCreated && (isNaN(year as number) || year! < 1900 || year! > new Date().getFullYear())) {
        return { error: "Year must be between 1900 and current year" };
      }

      // If address changed, use forward geocoding to get new coordinates
      const { updateArtwork } = await import("../lib/artworks.server");
      const updateData: any = {
        title: title.trim(),
        yearCreated: year || undefined,
        description: description?.trim() || undefined,
      };

      if (address && address !== artwork.address) {
        const { forwardGeocode } = await import("~/lib/geocoding.server");
        const geoResult = await forwardGeocode(address);
        if (geoResult) {
          updateData.latitude = geoResult.latitude;
          updateData.longitude = geoResult.longitude;
          updateData.address = geoResult.address;
        } else {
          return { error: "Could not find location for the provided address" };
        }
      }

      await updateArtwork(id, updateData);

      return { success: true, message: "Artwork updated successfully" };
    } catch (error) {
      console.error("[ARTWORK] Error updating metadata:", error);
      return {
        error: error instanceof Error ? error.message : "Failed to update artwork",
      };
    }
  }

  if (intent === "add-to-wall") {
    try {
      const wallId = formData.get("wallId") as string;
      const artworkTitle = formData.get("artworkTitle") as string;

      if (!wallId) {
        return { error: "Wall ID is required" };
      }

      const { addArtworkToCollection } = await import("~/lib/collections.server");
      await addArtworkToCollection(wallId, id);

      return { success: true, message: `Added to wall successfully` };
    } catch (error) {
      console.error("[WALL] Error adding artwork to wall:", error);
      return {
        error: error instanceof Error ? error.message : "Failed to add to wall",
      };
    }
  }

  return { error: "Unknown intent" };
};

export default function ArtworkDetailPage() {
  const navigate = useNavigate();
  const revalidator = useRevalidator();
  const rootData = useRouteLoaderData("root") as any;
  const loaderData = useRouteLoaderData("routes/artwork.$id") as any;
  const artwork = loaderData?.artwork;
  const photos = loaderData?.photos ?? [];
  const currentUser = loaderData?.currentUser;
  const userPendingClaimsCount = loaderData?.userPendingClaimsCount ?? 0;
  const fetcher = useFetcher<any>();
  const { scheme, noiseColor } = useTheme();
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(artwork?.title || "");
  const [editYear, setEditYear] = useState(artwork?.yearCreated?.toString() || "");
  const [editDescription, setEditDescription] = useState(artwork?.description || "");
  const [editAddress, setEditAddress] = useState(artwork?.address || "");
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Clear success message after 3 seconds
  useEffect(() => {
    if (saveSuccess) {
      const timer = setTimeout(() => setSaveSuccess(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [saveSuccess]);

  // Update local state when fetcher data returns success
  useEffect(() => {
    if (fetcher.data?.success) {
      setSaveSuccess(true);
      setIsEditing(false);
      // Revalidate all loaders to refresh cached data across the app
      revalidator.revalidate();
    }
  }, [fetcher.data, revalidator]);

  if (!artwork) {
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
            <h1 className="text-2xl font-bold mb-4">Artwork Not Found</h1>
            <p className="mb-6" style={{ color: scheme.divider }}>The artwork you're looking for doesn't exist.</p>
            <a href="/" className="font-medium hover:opacity-80" style={{ color: scheme.accent }}>
              ← Back to Gallery
            </a>
          </div>
        </main>
      </div>
    );
  }

  // Determine visibility: only show pending approval to the artist who made the claim
  const isClaimMaker = currentUser?.id === artwork.artistId && artwork.claimStatus === "PENDING_APPROVAL";
  const displayStatus = isClaimMaker ? artwork.claimStatus : (artwork.claimStatus === "PENDING_APPROVAL" ? "UNCLAIMED" : artwork.claimStatus);

  const statusLabel = {
    UNCLAIMED: "Unclaimed",
    PENDING_APPROVAL: "Pending Approval",
    CLAIMED: "Claimed by Artist",
  }[displayStatus || "UNCLAIMED"];

  const statusColor = {
    UNCLAIMED: "bg-gray-100 text-gray-800",
    PENDING_APPROVAL: "bg-yellow-100 text-yellow-800",
    CLAIMED: "bg-green-100 text-green-800",
  }[displayStatus || "UNCLAIMED"];

  // Separate photos into official (artist-curated) and community
  const officialPhotos = artwork.claimStatus === "CLAIMED"
    ? photos.filter((photo: any) => photo.userId === artwork.artist?.id)
    : [];
  const communityPhotos = photos.filter((photo: any) =>
    artwork.claimStatus !== "CLAIMED" || photo.userId !== artwork.artist?.id
  );

  const primaryPhoto = officialPhotos[0] || communityPhotos[0];

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
        {/* Header with Back Button */}
        <div className="mb-8">
          <button
            onClick={() => navigate(-1)}
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
                    <div className="space-y-3">
                      {officialPhotos.map((photo: any) => (
                        <div
                          key={photo.id}
                          className="rounded overflow-hidden bg-gray-100 hover:shadow-md transition"
                        >
                          <img
                            src={photo.photoUrl}
                            alt="Official"
                            className="w-full h-48 object-cover hover:opacity-75 cursor-pointer transition"
                          />
                          <div className="p-2 bg-white">
                            <p className="text-xs text-gray-600">
                              Uploaded by{" "}
                              <a
                                href={`/user/${photo.user.id}`}
                                className="text-blue-600 hover:text-blue-700 font-medium"
                              >
                                {photo.user.name || photo.user.email}
                              </a>
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              {new Date(photo.uploadedAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Community Gallery */}
                {communityPhotos.length > 0 && (
                  <div className="bg-white rounded-lg shadow-md p-4">
                    <p className="text-sm font-semibold text-gray-900 mb-3">
                      Community Photos ({communityPhotos.length})
                    </p>
                    <div className="space-y-3">
                      {communityPhotos.map((photo: any) => (
                        <div
                          key={photo.id}
                          className="rounded overflow-hidden bg-gray-100 hover:shadow-md transition"
                        >
                          <img
                            src={photo.photoUrl}
                            alt="Community"
                            className="w-full h-48 object-cover hover:opacity-75 cursor-pointer transition"
                          />
                          <div className="p-2 bg-white">
                            <p className="text-xs text-gray-600">
                              Uploaded by{" "}
                              <a
                                href={`/user/${photo.user.id}`}
                                className="text-blue-600 hover:text-blue-700 font-medium"
                              >
                                {photo.user.name || photo.user.email}
                              </a>
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              {new Date(photo.uploadedAt).toLocaleDateString()}
                            </p>
                          </div>
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
                <div className="flex items-start justify-between mb-2">
                  <h1 className="text-2xl font-bold text-gray-900 flex-1">{artwork.title}</h1>
                  {artwork.claimStatus === "CLAIMED" && artwork.artistId === rootData?.user?.id && !isEditing && (
                    <button
                      onClick={() => setIsEditing(true)}
                      className="ml-2 text-blue-600 hover:text-blue-700 text-sm font-medium"
                    >
                      Edit
                    </button>
                  )}
                </div>
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
              {artwork.yearCreated ? (
                <div>
                  <p className="text-sm text-gray-600 mb-2">Year Created</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {artwork.yearCreated}
                  </p>
                </div>
              ) : null}

              {/* Location */}
              <div>
                <p className="text-sm text-gray-600 mb-2">Location</p>
                <p className="text-sm font-mono text-gray-900">
                  {artwork.latitude.toFixed(6)}, {artwork.longitude.toFixed(6)}
                </p>
                {artwork.address && (
                  <p className="text-sm text-gray-700 mt-1">{artwork.address}</p>
                )}
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

              {/* Unified Edit Form */}
              {isEditing && artwork.claimStatus === "CLAIMED" && artwork.artistId === rootData?.user?.id && (
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Edit Artwork Details</h3>
                  <fetcher.Form method="post" className="space-y-4">
                    <input type="hidden" name="intent" value="update-metadata" />

                    {/* Title */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                      <input
                        type="text"
                        name="title"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        placeholder="Artwork title"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    {/* Year Created */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Year Created</label>
                      <input
                        type="number"
                        name="year"
                        value={editYear}
                        onChange={(e) => setEditYear(e.target.value)}
                        placeholder="e.g., 2023"
                        min="1900"
                        max={new Date().getFullYear()}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    {/* Address */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                      <input
                        type="text"
                        name="address"
                        value={editAddress}
                        onChange={(e) => setEditAddress(e.target.value)}
                        placeholder="e.g., 120 West 1st Street, Los Angeles, CA"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      />
                      <p className="text-xs text-gray-500 mt-1">Changing the address will update the location coordinates</p>
                    </div>

                    {/* Description */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                      <textarea
                        name="description"
                        value={editDescription}
                        onChange={(e) => setEditDescription(e.target.value)}
                        placeholder="Add a description..."
                        rows={4}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    {/* Save/Cancel Buttons */}
                    <div className="flex gap-2">
                      <button
                        type="submit"
                        disabled={fetcher.state !== "idle"}
                        className="flex-1 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {fetcher.state !== "idle" ? "Saving..." : "Save Changes"}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsEditing(false);
                          setEditTitle(artwork.title);
                          setEditYear(artwork.yearCreated?.toString() || "");
                          setEditDescription(artwork.description || "");
                          setEditAddress(artwork.address || "");
                        }}
                        className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                    </div>
                  </fetcher.Form>
                </div>
              )}

              {/* Actions */}
              <div className="pt-4 border-t space-y-2">
                {/* Claim Button - Only for ARTIST role on UNCLAIMED artworks */}
                {rootData?.user && rootData?.user?.role === "ARTIST" && displayStatus === "UNCLAIMED" && (
                  <fetcher.Form method="post" className="w-full">
                    <input type="hidden" name="intent" value="claim-artwork" />
                    <Button
                      variant="primary"
                      size="sm"
                      type="submit"
                      disabled={fetcher.state !== "idle"}
                      className="w-full"
                    >
                      {fetcher.state !== "idle" ? "Claiming..." : "Claim This Artwork"}
                    </Button>
                  </fetcher.Form>
                )}

                {/* Claim Status Messages - Only for claim maker */}
                {isClaimMaker && (
                  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
                    <p className="font-semibold">Claim Pending Admin Review</p>
                    <p className="text-xs mt-1">We're verifying your claim. You'll be able to edit the artwork details once approved.</p>
                    <p className="text-xs mt-2 text-yellow-700">
                      You have <span className="font-semibold">{userPendingClaimsCount}</span> of 3 allowed pending claims.
                    </p>
                  </div>
                )}

                {/* Unclaim Button - Only for claim maker */}
                {isClaimMaker && (
                  <fetcher.Form method="post" className="w-full">
                    <input type="hidden" name="intent" value="unclaim-artwork" />
                    <Button
                      variant="secondary"
                      size="sm"
                      type="submit"
                      disabled={fetcher.state !== "idle"}
                      className="w-full"
                    >
                      {fetcher.state !== "idle" ? "Withdrawing..." : "Withdraw Claim"}
                    </Button>
                  </fetcher.Form>
                )}

                {/* Add Photo Button */}
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => (window.location.href = `/artwork/upload?artworkId=${artwork.id}`)}
                  className="w-full"
                >
                  📸 Add Your Photo
                </Button>

                {/* Add to Wall Button - For signed-in users */}
                {rootData?.user && (
                  <AddToWallButton
                    artworkId={artwork.id}
                    artworkTitle={artwork.title}
                  />
                )}

                {/* Save Success Message - Displayed after edit form closes */}
              {saveSuccess && (
                <div className="p-3 bg-green-50 border border-green-200 rounded text-sm text-green-800">
                  ✓ Artwork updated successfully
                </div>
              )}

              {/* Error Messages */}
              {fetcher.data?.error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-800">
                  {fetcher.data.error}
                </div>
              )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  const { scheme, noiseColor } = useTheme();
  return (
    <div
      className="min-h-screen relative py-12 px-4"
      suppressHydrationWarning
      style={{
        backgroundColor: scheme.primaryBg,
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='2.5' numOctaves='4' seed='2'/%3E%3CfeColorMatrix type='saturate' values='0.08'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' fill='%23${noiseColor}' filter='url(%23noise)' opacity='0.5'/%3E%3C/svg%3E")`,
        backgroundAttachment: "fixed",
      }}
    >
      <div className="max-w-md mx-auto text-center" style={{ color: scheme.text }}>
        <h1 className="text-2xl font-bold mb-4">Error Loading Artwork</h1>
        <p className="mb-6">
          {error instanceof Error ? error.message : "An error occurred while loading this artwork."}
        </p>
        <a href="/" className="font-medium hover:opacity-80" style={{ color: scheme.accent }}>
          ← Back to Gallery
        </a>
      </div>
    </div>
  );
}
