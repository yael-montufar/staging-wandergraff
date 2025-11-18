import { calculateDistance, isValidCoordinates } from "./geo";
import { prismaClient } from "./db.server";

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

  const prisma = await prismaClient();

  // Debug: Check if user exists
  console.log("[ARTWORK] Creating artwork for user:", createdById);
  const userExists = await prisma.user.findUnique({
    where: { id: createdById },
    select: { id: true, email: true },
  });
  console.log("[ARTWORK] User exists in DB:", userExists);

  if (!userExists) {
    throw new Error(`User with ID ${createdById} not found in database`);
  }

  return prisma.artwork.create({
    data: {
      title,
      latitude,
      longitude,
      createdById,
      description: options?.description,
      yearCreated: options?.yearCreated,
      artistId: options?.artistId,
    },
  });
}

export async function getArtwork(id: string) {
  const prisma = await prismaClient();

  return prisma.artwork.findUnique({
    where: { id },
    include: {
      createdBy: true,
      artist: true,
      photos: true,
      galleries: true,
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
  const prisma = await prismaClient();

  return prisma.artwork.update({
    where: { id },
    data,
  });
}

export async function claimArtwork(artworkId: string, artistId: string) {
  const prisma = await prismaClient();

  return prisma.artwork.update({
    where: { id: artworkId },
    data: {
      artistId,
      claimStatus: "PENDING_APPROVAL",
    },
  });
}

export async function approveClaim(artworkId: string) {
  const prisma = await prismaClient();

  return prisma.artwork.update({
    where: { id: artworkId },
    data: {
      claimStatus: "CLAIMED",
    },
  });
}

export async function rejectClaim(artworkId: string) {
  const prisma = await prismaClient();

  return prisma.artwork.update({
    where: { id: artworkId },
    data: {
      claimStatus: "UNCLAIMED",
      artistId: null,
    },
  });
}

export async function findNearbyArtworks(
  latitude: number,
  longitude: number,
  radiusMeters = PROXIMITY_RADIUS_METERS
) {
  const prisma = await prismaClient();

  const artworks = await prisma.artwork.findMany({
    include: {
      createdBy: true,
      artist: true,
    },
  });

  return artworks.filter((artwork) =>
    calculateDistance(latitude, longitude, artwork.latitude, artwork.longitude) <=
    radiusMeters
  );
}

export async function getArtworksInBounds(
  minLat: number,
  maxLat: number,
  minLon: number,
  maxLon: number,
  limit = 100
) {
  const prisma = await prismaClient();

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
    take: limit,
    include: {
      createdBy: true,
      artist: true,
    },
  });
}

export async function getArtworksByArtist(artistId: string) {
  const prisma = await prismaClient();

  return prisma.artwork.findMany({
    where: {
      artistId,
      claimStatus: "CLAIMED",
    },
    orderBy: {
      yearCreated: "desc",
    },
    include: {
      createdBy: true,
      artist: true,
    },
  });
}

export async function getArtworksByYear(year: number) {
  const prisma = await prismaClient();

  return prisma.artwork.findMany({
    where: {
      yearCreated: year,
      claimStatus: "CLAIMED",
    },
    orderBy: {
      createdAt: "desc",
    },
    include: {
      createdBy: true,
      artist: true,
    },
  });
}

export async function getYearsWithArtworks() {
  const prisma = await prismaClient();

  const artworks = await prisma.artwork.findMany({
    where: {
      yearCreated: {
        not: null,
      },
      claimStatus: "CLAIMED",
    },
    select: {
      yearCreated: true,
    },
  });

  const years = [...new Set(artworks.map((a) => a.yearCreated))]
    .filter((year) => year !== null)
    .sort((a, b) => (b as number) - (a as number));

  return years;
}

export async function getArtworkCountByYear(year: number) {
  const prisma = await prismaClient();

  return prisma.artwork.count({
    where: {
      yearCreated: year,
      claimStatus: "CLAIMED",
    },
  });
}

export async function listArtists(limit = 100) {
  const prisma = await prismaClient();

  const artists = await prisma.user.findMany({
    where: {
      role: "ARTIST",
    },
    take: limit,
    orderBy: {
      name: "asc",
    },
    include: {
      claimedArtworks: {
        where: {
          claimStatus: "CLAIMED",
        },
      },
    },
  });

  return artists.map((artist) => ({
    ...artist,
    artworkCount: artist.claimedArtworks.length,
  }));
}

export async function getRecentArtworks(limit = 20) {
  const prisma = await prismaClient();

  return prisma.artwork.findMany({
    orderBy: {
      createdAt: "desc",
    },
    take: limit,
    include: {
      createdBy: true,
      artist: true,
      photos: {
        take: 1,
        orderBy: {
          takenAt: "desc",
        },
      },
    },
  });
}
