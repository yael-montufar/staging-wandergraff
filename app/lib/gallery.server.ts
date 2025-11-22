import { prismaClient } from "./db.server";

// Re-export gallery presets from client-safe module
export { GALLERY_PRESETS, type GalleryPresetKey } from "./gallery.client";

/**
 * Get artist-uploaded photos for an artwork that can be added to official gallery
 */
export async function getArtistPhotosForGallery(artworkId: string, artistId: string) {
  const prisma = await prismaClient();

  return prisma.photo.findMany({
    where: {
      artworkId,
      userId: artistId,
    },
    select: {
      id: true,
      photoUrl: true,
      uploadedAt: true,
      user: {
        select: {
          name: true,
          id: true,
        },
      },
    },
    orderBy: { uploadedAt: "desc" },
  });
}

/**
 * Update gallery image order
 */
export async function updateGalleryOrder(artworkId: string, photoIds: string[]) {
  const prisma = await prismaClient();

  return prisma.artwork.update({
    where: { id: artworkId },
    data: {
      galleryImageOrder: photoIds,
    },
  });
}

/**
 * Publish/unpublish official gallery
 */
export async function toggleGalleryPublished(artworkId: string, published: boolean) {
  const prisma = await prismaClient();

  return prisma.artwork.update({
    where: { id: artworkId },
    data: { galleryPublished: published },
  });
}

/**
 * Get official gallery photos in correct order
 */
export async function getOfficialGalleryPhotos(artworkId: string) {
  const prisma = await prismaClient();

  const artwork = await prisma.artwork.findUnique({
    where: { id: artworkId },
    select: {
      galleryImageOrder: true,
      photos: {
        where: { isPrivate: false },
        select: { id: true, photoUrl: true, user: { select: { name: true, id: true } }, uploadedAt: true },
      },
    },
  });

  if (!artwork) return [];

  const photoIds = (artwork.galleryImageOrder as string[]) || [];
  const photoMap = new Map(artwork.photos.map((p: any) => [p.id, p]));

  // Return photos in the order specified by galleryImageOrder
  return photoIds
    .map((id: string) => photoMap.get(id))
    .filter(Boolean);
}

/**
 * Get community gallery photos (all public photos not in official order)
 * with pagination support
 */
export async function getCommunityGalleryPhotos(artworkId: string, skip = 0, take = 9) {
  const prisma = await prismaClient();

  const artwork = await prisma.artwork.findUnique({
    where: { id: artworkId },
    select: { galleryImageOrder: true },
  });

  const officialPhotoIds = new Set((artwork?.galleryImageOrder as string[]) || []);

  const photos = await prisma.photo.findMany({
    where: {
      artworkId,
      isPrivate: false,
      id: {
        notIn: Array.from(officialPhotoIds),
      },
    },
    include: {
      user: {
        select: { name: true, id: true },
      },
    },
    orderBy: { uploadedAt: "desc" },
    skip,
    take,
  });

  return photos;
}

/**
 * Get total count of community gallery photos (for pagination)
 */
export async function getCommunityGalleryCount(artworkId: string) {
  const prisma = await prismaClient();

  const artwork = await prisma.artwork.findUnique({
    where: { id: artworkId },
    select: { galleryImageOrder: true },
  });

  const officialPhotoIds = new Set((artwork?.galleryImageOrder as string[]) || []);

  return prisma.photo.count({
    where: {
      artworkId,
      isPrivate: false,
      id: {
        notIn: Array.from(officialPhotoIds),
      },
    },
  });
}

/**
 * Generate a random preset seeded by artwork ID (deterministic)
 * This ensures same artwork always gets same "random" preset
 */
export function getRandomPresetSeeded(artworkId: string): GalleryPresetKey {
  const presetKeys = Object.keys(GALLERY_PRESETS) as GalleryPresetKey[];
  
  // Use artwork ID hash to generate deterministic index
  let hash = 0;
  for (let i = 0; i < artworkId.length; i++) {
    const char = artworkId.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  
  const index = Math.abs(hash) % presetKeys.length;
  return presetKeys[index];
}
