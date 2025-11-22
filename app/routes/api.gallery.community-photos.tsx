import type { Route } from "./+types/api.gallery.community-photos";
import { getCommunityGalleryPhotos } from "~/lib/gallery.server";

export const loader: Route.LoaderFunction = async ({ request }) => {
  const url = new URL(request.url);
  const artworkId = url.searchParams.get("artworkId");
  const skip = parseInt(url.searchParams.get("skip") || "0", 10);
  const take = parseInt(url.searchParams.get("take") || "9", 10);

  if (!artworkId) {
    return { error: "artworkId is required" }, { status: 400 };
  }

  try {
    const photos = await getCommunityGalleryPhotos(artworkId, skip, take);

    return {
      photos: photos.map((photo) => ({
        id: photo.id,
        photoUrl: photo.photoUrl,
        user: {
          id: photo.user.id,
          name: photo.user.name,
        },
        uploadedAt: photo.uploadedAt,
      })),
    };
  } catch (error) {
    console.error("[GALLERY API] Error loading community photos:", error);
    return { error: "Failed to load photos" }, { status: 500 };
  }
};
