import { prisma } from "./db.server";

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
  const photo = await prisma.photo.create({
    data: {
      userId,
      photoUrl,
      thumbnailUrl: options?.thumbnailUrl,
      takenAt,
      artworkId: options?.artworkId,
      isPrivate: options?.isPrivate ?? false,
      exifLatitude: options?.exifLatitude,
      exifLongitude: options?.exifLongitude,
      exifAltitude: options?.exifAltitude,
      metadata: options?.metadata,
    },
  });

  // If photo is not private and has artwork, add to default gallery
  if (!options?.isPrivate && options?.artworkId) {
    const defaultGallery = await prisma.gallery.findUnique({
      where: {
        artworkId_type: {
          artworkId: options.artworkId,
          type: "DEFAULT",
        },
      },
    });

    if (defaultGallery) {
      await prisma.galleryPhoto.create({
        data: {
          galleryId: defaultGallery.id,
          photoId: photo.id,
          order: 0,
        },
      });
    }
  }

  return photo;
}

export async function getPhoto(id: string) {
  return prisma.photo.findUnique({
    where: { id },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          avatarUrl: true,
        },
      },
      artwork: true,
    },
  });
}

export async function updatePhoto(
  id: string,
  data: {
    isPrivate?: boolean;
  }
) {
  return prisma.photo.update({
    where: { id },
    data,
  });
}

export async function deletePhoto(id: string) {
  // Delete from galleries first
  await prisma.galleryPhoto.deleteMany({
    where: { photoId: id },
  });

  // Delete photo
  return prisma.photo.delete({
    where: { id },
  });
}

export async function getPhotosByArtwork(
  artworkId: string,
  options?: {
    includePrivate?: boolean;
    sortBy?: "recent" | "oldest";
  }
) {
  return prisma.photo.findMany({
    where: {
      artworkId,
      isPrivate: options?.includePrivate ? undefined : false,
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          avatarUrl: true,
        },
      },
    },
    orderBy: {
      takenAt: options?.sortBy === "oldest" ? "asc" : "desc",
    },
  });
}

export async function getPhotosByUser(userId: string) {
  return prisma.photo.findMany({
    where: {
      userId,
    },
    orderBy: {
      uploadedAt: "desc",
    },
  });
}

export async function getPhotosByGallery(
  galleryId: string,
  options?: {
    sortBy?: "order" | "date";
  }
) {
  const galleryPhotos = await prisma.galleryPhoto.findMany({
    where: { galleryId },
    include: {
      photo: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              avatarUrl: true,
            },
          },
        },
      },
    },
    orderBy: {
      order: "asc",
    },
  });

  return galleryPhotos.map((gp) => gp.photo);
}

export async function addPhotoToGallery(
  galleryId: string,
  photoId: string,
  order?: number
) {
  // Get max order if not specified
  if (order === undefined) {
    const maxOrder = await prisma.galleryPhoto.findFirst({
      where: { galleryId },
      orderBy: { order: "desc" },
      select: { order: true },
    });
    order = (maxOrder?.order ?? -1) + 1;
  }

  return prisma.galleryPhoto.create({
    data: {
      galleryId,
      photoId,
      order,
    },
  });
}

export async function removePhotoFromGallery(galleryId: string, photoId: string) {
  return prisma.galleryPhoto.delete({
    where: {
      galleryId_photoId: {
        galleryId,
        photoId,
      },
    },
  });
}

export async function reorderGalleryPhotos(
  galleryId: string,
  photoIds: string[]
) {
  const updates = photoIds.map((photoId, index) =>
    prisma.galleryPhoto.update({
      where: {
        galleryId_photoId: {
          galleryId,
          photoId,
        },
      },
      data: {
        order: index,
      },
    })
  );

  return Promise.all(updates);
}

export async function getRecentPhotos(
  artworkId: string,
  limit = 10
) {
  return prisma.photo.findMany({
    where: {
      artworkId,
      isPrivate: false,
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          avatarUrl: true,
        },
      },
    },
    orderBy: {
      uploadedAt: "desc",
    },
    take: limit,
  });
}

export async function getPhotoCount(artworkId: string) {
  return prisma.photo.count({
    where: {
      artworkId,
      isPrivate: false,
    },
  });
}

export async function getUserPrivatePhotos(userId: string) {
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
