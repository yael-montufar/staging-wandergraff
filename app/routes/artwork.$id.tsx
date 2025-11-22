import { useParams, useRouteLoaderData, useFetcher, useNavigate, useRevalidator } from "react-router";
import { useState, useEffect } from "react";
import type { Route } from "./+types/artwork.$id";
import { Header } from "../components/Header";
import { Button } from "../components/ui/Button";
import { AddToWallButton } from "../components/AddToWallButton";
import { MasonryGallery } from "../components/MasonryGallery";
import { CommunityGallery } from "../components/CommunityGallery";
import { DetailsDrawer } from "../components/DetailsDrawer";
import { getArtwork, claimArtwork } from "../lib/artworks.server";
import { getPhotosByArtwork } from "../lib/photos.server";
import { getOfficialGalleryPhotos, getCommunityGalleryPhotos, getCommunityGalleryCount } from "../lib/gallery.server";
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

    // Get official gallery photos (if published and claimed)
    let officialPhotos: any[] = [];
    if (artwork.claimStatus === "CLAIMED" && artwork.galleryPublished) {
      officialPhotos = await getOfficialGalleryPhotos(id);
    }

    // Get initial community gallery photos (first 9)
    const communityPhotos = await getCommunityGalleryPhotos(id, 0, 9);
    const communityPhotoCount = await getCommunityGalleryCount(id);

    // Get old photos structure for backward compatibility
    const allPhotos = await getPhotosByArtwork(id, { includePrivate: false });

    return {
      artwork,
      allPhotos,
      officialPhotos,
      communityPhotos,
      communityPhotoCount,
      currentUser: user,
      userPendingClaimsCount,
    };
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
  const allPhotos = loaderData?.allPhotos ?? [];
  const officialPhotosData = loaderData?.officialPhotos ?? [];
  const communityPhotosData = loaderData?.communityPhotos ?? [];
  const communityPhotoCount = loaderData?.communityPhotoCount ?? 0;
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
  const [communityPhotos, setCommunityPhotos] = useState(communityPhotosData);
  const [communityOffset, setCommunityOffset] = useState(9);
  const [communityLoading, setCommunityLoading] = useState(false);
  const [showPhotoPickerModal, setShowPhotoPickerModal] = useState(false);

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

  const handleLoadMoreCommunity = async () => {
    setCommunityLoading(true);
    try {
      const response = await fetch(`/api/gallery.community-photos?artworkId=${artwork.id}&skip=${communityOffset}&take=9`);
      const data = await response.json();
      if (data.photos) {
        setCommunityPhotos([...communityPhotos, ...data.photos]);
        setCommunityOffset(communityOffset + 9);
      }
    } catch (error) {
      console.error("[GALLERY] Error loading more photos:", error);
    } finally {
      setCommunityLoading(false);
    }
  };

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

  // Get primary photo (featured image)
  const primaryPhoto = officialPhotosData[0] || communityPhotos[0] || allPhotos[0];

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
        {/* Header with Back Button and Info Button */}
        <div className="mb-8 flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="text-blue-600 hover:text-blue-700 font-medium flex items-center gap-2"
          >
            ← Back
          </button>
          <button
            onClick={() => setShowPhotoPickerModal(true)}
            className="text-sm font-medium px-4 py-2 rounded transition-all hover:opacity-80"
            style={{
              backgroundColor: scheme.accent,
              color: "white",
            }}
          >
            ℹ️ Details
          </button>
        </div>

        {/* Main Content */}
        <div className="space-y-8">
          {/* Official Gallery - Masonry Layout */}
          {officialPhotosData.length > 0 && artwork.claimStatus === "CLAIMED" && artwork.galleryPublished && (
            <div>
              <MasonryGallery
                photos={officialPhotosData}
                preset={artwork.galleryPreset || "preset_1"}
              />
            </div>
          )}

          {/* Manage Gallery Button - Always visible for artist with claimed artwork */}
          {artwork.claimStatus === "CLAIMED" && artwork.artistId === currentUser?.id && (
            <div className="flex justify-center">
              <a
                href={`/artwork/${artwork.id}/edit-gallery`}
                className="text-sm font-medium px-4 py-2 rounded border-2 hover:shadow-lg transition-all"
                style={{
                  borderColor: scheme.accent,
                  color: scheme.accent,
                }}
              >
                ✏️ Manage Gallery
              </a>
            </div>
          )}

          {/* Community Gallery - 3-col Instagram grid with load more */}
          {communityPhotos.length > 0 && (
            <CommunityGallery
              photos={communityPhotos}
              hasMore={communityPhotos.length < communityPhotoCount}
              onLoadMore={handleLoadMoreCommunity}
              isLoading={communityLoading}
            />
          )}

          {/* No photos state */}
          {allPhotos.length === 0 && (
            <div className="rounded-lg bg-gray-200 h-96 flex items-center justify-center">
              <div className="text-center" style={{ color: scheme.divider }}>
                <p className="text-lg font-medium mb-2">No photos yet</p>
                <p className="text-sm">Be the first to upload a photo</p>
              </div>
            </div>
          )}
        </div>

        {showPhotoPickerModal && (
          <DetailsDrawer
            artwork={artwork}
            allPhotos={allPhotos}
            currentUser={rootData?.user}
            onClose={() => setShowPhotoPickerModal(false)}
            fetcher={fetcher}
            isEditing={isEditing}
            editTitle={editTitle}
            editYear={editYear}
            editDescription={editDescription}
            editAddress={editAddress}
            onEditChange={(field, value) => {
              switch (field) {
                case "title":
                  setEditTitle(value);
                  break;
                case "year":
                  setEditYear(value);
                  break;
                case "description":
                  setEditDescription(value);
                  break;
                case "address":
                  setEditAddress(value);
                  break;
              }
            }}
            onEditStart={() => setIsEditing(true)}
            onEditCancel={() => {
              setIsEditing(false);
              setEditTitle(artwork.title);
              setEditYear(artwork.yearCreated?.toString() || "");
              setEditDescription(artwork.description || "");
              setEditAddress(artwork.address || "");
            }}
            saveSuccess={saveSuccess}
            communityPhotos={communityPhotos}
            onLoadMoreCommunity={handleLoadMoreCommunity}
            communityLoading={communityLoading}
            communityPhotoCount={communityPhotoCount}
          />
        )}
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
