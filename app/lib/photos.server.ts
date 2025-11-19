import { prismaClient } from "./db.server";

export async function createPhoto(
  userId: string,
  photoUrl: string,
  takenAt: Date,
  options?: {
    artworkId?: string;
    thumbnailUrl?: string;
    isPrivate?: boolean;
    exifLatitude?: number;
    exifLongitude?: number;
    exifAltitude?: number;
    metadata?: Record<string, any>;
  }
) {
  const prisma = await prismaClient();

  return prisma.photo.create({
    data: {
      userId,
      photoUrl,
      takenAt,
      thumbnailUrl: options?.thumbnailUrl,
      isPrivate: options?.isPrivate ?? false,
      artworkId: options?.artworkId,
      exifLatitude: options?.exifLatitude,
      exifLongitude: options?.exifLongitude,
      exifAltitude: options?.exifAltitude,
      metadata: options?.metadata,
    },
  });
}

export async function getPhoto(id: string) {
  const prisma = await prismaClient();

  return prisma.photo.findUnique({
    where: { id },
    include: {
      user: true,
      artwork: true,
    },
  });
}

export async function updatePhoto(
  id: string,
  data: {
    isPrivate?: boolean;
    artworkId?: string;
  }
) {
  const prisma = await prismaClient();

  return prisma.photo.update({
    where: { id },
    data,
  });
}

export async function deletePhoto(id: string) {
  const prisma = await prismaClient();

  // Get photo before deleting to access artworkId
  const photo = await prisma.photo.findUnique({
    where: { id },
    select: { artworkId: true },
  });

  if (!photo) {
    throw new Error(`Photo with ID ${id} not found`);
  }

  // Delete the photo
  await prisma.photo.delete({
    where: { id },
  });

  console.log("[PHOTO] Deleted photo:", id);

  // If photo was associated with an artwork, check if artwork still has photos
  if (photo.artworkId) {
    console.log("[PHOTO] Checking if artwork still has photos:", photo.artworkId);

    // Get artwork claim status
    const artwork = await prisma.artwork.findUnique({
      where: { id: photo.artworkId },
      select: { claimStatus: true },
    });

    if (!artwork) {
      console.log("[PHOTO] Artwork not found:", photo.artworkId);
      return;
    }

    const remainingPhotos = await prisma.photo.count({
      where: { artworkId: photo.artworkId },
    });

    console.log("[PHOTO] Remaining photos for artwork:", remainingPhotos);
    console.log("[PHOTO] Artwork claim status:", artwork.claimStatus);

    // Only auto-delete if:
    // 1. No photos remain AND
    // 2. Artwork is UNCLAIMED (not being actively curated by an artist)
    if (remainingPhotos === 0 && artwork.claimStatus === "UNCLAIMED") {
      console.log("[PHOTO] No photos and artwork is unclaimed, deleting artwork:", photo.artworkId);

      try {
        // Import deleteArtwork to avoid circular dependency
        const { deleteArtwork } = await import("./artworks.server");
        await deleteArtwork(photo.artworkId);
        console.log("[PHOTO] Artwork auto-deleted due to no remaining photos and unclaimed status");
      } catch (error) {
        console.error("[PHOTO] Error auto-deleting artwork:", error);
        // Don't throw - photo is already deleted successfully
      }
    } else if (remainingPhotos === 0 && artwork.claimStatus !== "UNCLAIMED") {
      console.log("[PHOTO] Artwork is claimed/pending, preserving despite no photos for artist curation");
    }
  }
}

export async function getPhotosByArtwork(
  artworkId: string,
  options?: {
    includePrivate?: boolean;
    sortBy?: "recent" | "oldest";
  }
) {
  const prisma = await prismaClient();

  const orderBy = options?.sortBy === "oldest" ? "asc" : "desc";

  return prisma.photo.findMany({
    where: {
      artworkId,
      isPrivate: options?.includePrivate ? undefined : false,
    },
    orderBy: {
      takenAt: orderBy,
    },
    include: {
      user: true,
    },
  });
}

export async function getPhotosByUser(userId: string) {
  const prisma = await prismaClient();

  return prisma.photo.findMany({
    where: { userId },
    orderBy: { uploadedAt: "desc" },
    include: {
      artwork: true,
    },
  });
}

export async function getPhotosByGallery(
  galleryId: string,
  options?: {
    sortBy?: "order" | "date";
  }
) {
  const prisma = await prismaClient();

  const orderBy = options?.sortBy === "date" ? { photo: { takenAt: "desc" } } : { order: "asc" };

  return prisma.galleryPhoto.findMany({
    where: { galleryId },
    orderBy,
    include: {
      photo: {
        include: {
          user: true,
        },
      },
    },
  });
}

export async function addPhotoToGallery(
  galleryId: string,
  photoId: string,
  order?: number
) {
  const prisma = await prismaClient();

  return prisma.galleryPhoto.create({
    data: {
      galleryId,
      photoId,
      order: order ?? 0,
    },
  });
}

export async function removePhotoFromGallery(galleryId: string, photoId: string) {
  const prisma = await prismaClient();

  return prisma.galleryPhoto.deleteMany({
    where: {
      galleryId,
      photoId,
    },
  });
}

export async function reorderGalleryPhotos(
  galleryId: string,
  photoIds: string[]
) {
  const prisma = await prismaClient();

  return Promise.all(
    photoIds.map((photoId, index) =>
      prisma.galleryPhoto.updateMany({
        where: {
          galleryId,
          photoId,
        },
        data: {
          order: index,
        },
      })
    )
  );
}

export async function getRecentPhotos(
  artworkId: string,
  limit = 10
) {
  const prisma = await prismaClient();

  return prisma.photo.findMany({
    where: {
      artworkId,
      isPrivate: false,
    },
    orderBy: {
      takenAt: "desc",
    },
    take: limit,
    include: {
      user: true,
    },
  });
}

export async function getPhotoCount(artworkId: string) {
  const prisma = await prismaClient();

  return prisma.photo.count({
    where: {
      artworkId,
      isPrivate: false,
    },
  });
}

export async function getUserPrivatePhotos(userId: string) {
  const prisma = await prismaClient();

  return prisma.photo.findMany({
    where: {
      userId,
      isPrivate: true,
    },
    orderBy: {
      uploadedAt: "desc",
    },
  });
}
