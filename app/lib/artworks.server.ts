import { prisma } from "./db.server";
import { calculateDistance, isValidCoordinates } from "./geo";

const PROXIMITY_RADIUS_METERS = 20;

export async function createArtwork(
  title: string,
  latitude: number,
  longitude: number,
  createdById: string,
  options?: {
    description?: string;
    yearCreated?: number;
    artistId?: string;
  }
) {
  if (!isValidCoordinates(latitude, longitude)) {
    throw new Error("Invalid coordinates");
  }

  // Create artwork
  const artwork = await prisma.artwork.create({
    data: {
      title,
      latitude,
      longitude,
      createdById,
      description: options?.description,
      yearCreated: options?.yearCreated,
      artistId: options?.artistId,
      claimStatus: options?.artistId ? "CLAIMED" : "UNCLAIMED",
    },
  });

  // Create default gallery
  await prisma.gallery.create({
    data: {
      artworkId: artwork.id,
      type: "DEFAULT",
    },
  });

  return artwork;
}

export async function getArtwork(id: string) {
  return prisma.artwork.findUnique({
    where: { id },
    include: {
      createdBy: {
        select: {
          id: true,
          name: true,
          avatarUrl: true,
        },
      },
      artist: {
        select: {
          id: true,
          name: true,
          avatarUrl: true,
          bio: true,
        },
      },
      galleries: {
        include: {
          photos: {
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
          },
        },
      },
    },
  });
}

export async function updateArtwork(
  id: string,
  data: {
    title?: string;
    description?: string;
    yearCreated?: number;
  }
) {
  return prisma.artwork.update({
    where: { id },
    data,
  });
}

export async function claimArtwork(artworkId: string, artistId: string) {
  return prisma.artwork.update({
    where: { id: artworkId },
    data: {
      artistId,
      claimStatus: "PENDING_APPROVAL",
    },
  });
}

export async function approveClaim(artworkId: string) {
  return prisma.artwork.update({
    where: { id: artworkId },
    data: {
      claimStatus: "CLAIMED",
    },
  });
}

export async function rejectClaim(artworkId: string) {
  return prisma.artwork.update({
    where: { id: artworkId },
    data: {
      artistId: null,
      claimStatus: "UNCLAIMED",
    },
  });
}

export async function findNearbyArtworks(
  latitude: number,
  longitude: number,
  radiusMeters = PROXIMITY_RADIUS_METERS
) {
  // Get all artworks and filter in memory using distance calculation
  const allArtworks = await prisma.artwork.findMany({
    select: {
      id: true,
      title: true,
      latitude: true,
      longitude: true,
      claimStatus: true,
    },
  });

  return allArtworks.filter((artwork) => {
    const distance = calculateDistance(
      latitude,
      longitude,
      artwork.latitude,
      artwork.longitude
    );
    return distance <= radiusMeters;
  });
}

export async function getArtworksInBounds(
  minLat: number,
  maxLat: number,
  minLon: number,
  maxLon: number,
  limit = 100
) {
  return prisma.artwork.findMany({
    where: {
      latitude: {
        gte: minLat,
        lte: maxLat,
      },
      longitude: {
        gte: minLon,
        lte: maxLon,
      },
    },
    select: {
      id: true,
      title: true,
      latitude: true,
      longitude: true,
      claimStatus: true,
    },
    take: limit,
  });
}

export async function getArtworksByArtist(artistId: string) {
  return prisma.artwork.findMany({
    where: {
      artistId,
      claimStatus: "CLAIMED",
    },
    include: {
      galleries: {
        where: { type: "OFFICIAL" },
        include: {
          photos: {
            include: {
              photo: true,
            },
          },
        },
      },
    },
    orderBy: {
      yearCreated: "desc",
    },
  });
}

export async function getArtworksByYear(year: number) {
  return prisma.artwork.findMany({
    where: {
      yearCreated: year,
      claimStatus: "CLAIMED",
    },
    include: {
      artist: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });
}

export async function getYearsWithArtworks() {
  const years = await prisma.artwork.findMany({
    where: {
      yearCreated: {
        not: null,
      },
      claimStatus: "CLAIMED",
    },
    select: {
      yearCreated: true,
    },
    distinct: ["yearCreated"],
    orderBy: {
      yearCreated: "desc",
    },
  });

  return years
    .map((y) => y.yearCreated)
    .filter((y) => y !== null) as number[];
}

export async function getArtworkCountByYear(year: number) {
  return prisma.artwork.count({
    where: {
      yearCreated: year,
      claimStatus: "CLAIMED",
    },
  });
}

export async function listArtists(limit = 100) {
  const artists = await prisma.user.findMany({
    where: {
      role: "ARTIST",
    },
    select: {
      id: true,
      name: true,
      avatarUrl: true,
      bio: true,
      _count: {
        select: {
          claimedArtworks: {
            where: {
              claimStatus: "CLAIMED",
            },
          },
        },
      },
    },
    orderBy: {
      name: "asc",
    },
    take: limit,
  });

  return artists.map((artist) => ({
    ...artist,
    artworkCount: artist._count.claimedArtworks,
  }));
}

export async function getRecentArtworks(limit = 20) {
  return prisma.artwork.findMany({
    orderBy: {
      createdAt: "desc",
    },
    take: limit,
    include: {
      galleries: {
        where: { type: "DEFAULT" },
        include: {
          photos: {
            include: {
              photo: true,
            },
            take: 1,
          },
        },
      },
    },
  });
}
