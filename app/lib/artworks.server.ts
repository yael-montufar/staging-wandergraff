import { calculateDistance, isValidCoordinates } from "./geo";
import { prismaClient } from "./db.server";
import { reverseGeocode, extractCountryFromCoordinates } from "./geocoding.server";
import {
  ensureCountryExists,
  ensureArtistExists,
  ensureYearExists,
  updateCountryCount,
  updateArtistCount,
  updateYearCount
} from "./curation.server";

const PROXIMITY_RADIUS_METERS = 20;

export async function createArtwork(
  latitude: number,
  longitude: number,
  createdById: string,
  options?: {
    title?: string;
    description?: string;
    yearCreated?: number;
    artistId?: string;
    address?: string;
  }
) {
  if (!isValidCoordinates(latitude, longitude)) {
    throw new Error("Invalid coordinates");
  }

  const prisma = await prismaClient();

  // Ensure user exists in database (in case of race condition after auth)
  console.log("[ARTWORK] Ensuring user exists in DB:", createdById);
  const user = await prisma.user.findUnique({
    where: { id: createdById },
    select: { id: true, email: true },
  });

  if (!user) {
    console.log("[ARTWORK] User not found, creating placeholder user");
    // Create a minimal user record if it doesn't exist
    // This handles race conditions where user creation API call was delayed/failed
    await prisma.user.create({
      data: {
        id: createdById,
        email: `user-${createdById}@wandergraff.local`,
        name: `User ${createdById.slice(0, 8)}`,
        role: "REGULAR_USER",
      },
    });
    console.log("[ARTWORK] User created successfully");
  }

  // Get address if not provided
  let address = options?.address;
  if (!address) {
    address = await reverseGeocode(latitude, longitude);
    console.log("[ARTWORK] Geocoded address:", address);
  }

  // Generate placeholder title if not provided
  const title = options?.title || `Untitled | ${address || "Unknown Location"}`;

  const artwork = await prisma.artwork.create({
    data: {
      title,
      latitude,
      longitude,
      address: address || undefined,
      createdById,
      description: options?.description,
      yearCreated: options?.yearCreated,
      artistId: options?.artistId,
    },
  });

  // Auto-create country record when artwork is created (location-based)
  console.log("[ARTWORK] Ensuring country exists for coordinates:", latitude, longitude);
  await ensureCountryExists(latitude, longitude);

  return artwork;
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
    latitude?: number;
    longitude?: number;
    address?: string;
  }
) {
  const prisma = await prismaClient();

  return prisma.artwork.update({
    where: { id },
    data,
  });
}

export async function deleteArtwork(id: string) {
  const prisma = await prismaClient();

  // Get artwork details before deleting
  const artwork = await prisma.artwork.findUnique({
    where: { id },
    include: {
      photos: true,
      artist: true,
    },
  });

  if (!artwork) {
    throw new Error(`Artwork with ID ${id} not found`);
  }

  // Delete photos from storage
  if (artwork.photos && artwork.photos.length > 0) {
    console.log("[ARTWORK] Deleting", artwork.photos.length, "photos from storage");
    for (const photo of artwork.photos) {
      if (photo.photoUrl) {
        await deleteFile(photo.photoUrl);
      }
    }
  }

  // Orphan all photos (set artworkId to null)
  await prisma.photo.updateMany({
    where: { artworkId: id },
    data: { artworkId: null },
  });

  // Delete collection items (they reference this artwork)
  await prisma.collectionItem.deleteMany({
    where: { artworkId: id },
  });

  // Delete saves
  await prisma.save.deleteMany({
    where: { artworkId: id },
  });

  // Delete galleries
  await prisma.gallery.deleteMany({
    where: { artworkId: id },
  });

  // Decrement country counter (countries are registered for all artworks, not just claimed)
  console.log("[ARTWORK] Decrementing country count for:", artwork.latitude, artwork.longitude);
  const countryName = await extractCountryFromCoordinates(artwork.latitude, artwork.longitude);
  if (countryName) {
    const country = await prisma.country.findUnique({
      where: { name: countryName },
    });
    if (country) {
      await updateCountryCount(country.id, -1);
    }
  }

  // Decrement artist counter only if artwork was CLAIMED
  if (artwork.claimStatus === "CLAIMED" && artwork.artist?.artistName) {
    console.log("[ARTWORK] Decrementing artist count:", artwork.artist.artistName);
    const artist = await prisma.artist.findUnique({
      where: { name: artwork.artist.artistName },
    });
    if (artist) {
      await updateArtistCount(artist.id, -1);
    }
  }

  // Decrement year counter only if artwork was CLAIMED and year provided
  if (artwork.claimStatus === "CLAIMED" && artwork.yearCreated) {
    console.log("[ARTWORK] Decrementing year count:", artwork.yearCreated);
    const artworkYear = await prisma.artworkYear.findUnique({
      where: { year: artwork.yearCreated },
    });
    if (artworkYear) {
      await updateYearCount(artworkYear.id, -1);
    }
  }

  // Finally delete the artwork itself
  return prisma.artwork.delete({
    where: { id },
  });
}

/**
 * Delete a file from storage
 */
async function deleteFile(photoUrl: string) {
  try {
    if (!photoUrl) return;

    // Extract filename from URL (handle both full URLs and relative paths)
    const url = new URL(photoUrl, "http://localhost");
    const pathname = url.pathname;

    // Determine file path
    let filePath: string;
    if (pathname.includes("/uploads/")) {
      // Extract the filename part
      const filename = pathname.split("/uploads/")[1];
      filePath = `public/uploads/${filename}`;
    } else {
      return; // Skip non-upload files
    }

    // Try to delete the file
    const fs = await import("fs/promises");
    try {
      await fs.unlink(filePath);
      console.log("[STORAGE] Deleted file:", filePath);
    } catch (err: any) {
      if (err.code === "ENOENT") {
        console.log("[STORAGE] File not found (already deleted):", filePath);
      } else {
        console.error("[STORAGE] Error deleting file:", filePath, err);
      }
    }
  } catch (error) {
    console.error("[STORAGE] Error processing file deletion:", error);
    // Don't throw - file cleanup failures shouldn't block artwork deletion
  }
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

  // Get artwork details before updating
  const artwork = await prisma.artwork.findUnique({
    where: { id: artworkId },
    include: { artist: true },
  });

  if (!artwork) {
    throw new Error(`Artwork with ID ${artworkId} not found`);
  }

  const updated = await prisma.artwork.update({
    where: { id: artworkId },
    data: {
      claimStatus: "CLAIMED",
    },
  });

  // Auto-create artist counter if artist exists
  if (artwork.artist?.artistName) {
    console.log("[ARTWORK] Ensuring artist exists:", artwork.artist.artistName);
    await ensureArtistExists(artwork.artist.artistName);
  }

  // Auto-create year counter if year provided
  if (artwork.yearCreated) {
    console.log("[ARTWORK] Ensuring year exists:", artwork.yearCreated);
    await ensureYearExists(artwork.yearCreated);
  }

  return updated;
}

export async function rejectClaim(artworkId: string) {
  const prisma = await prismaClient();

  // Get artwork details before updating
  const artwork = await prisma.artwork.findUnique({
    where: { id: artworkId },
    include: { artist: true },
  });

  if (!artwork) {
    throw new Error(`Artwork with ID ${artworkId} not found`);
  }

  const updated = await prisma.artwork.update({
    where: { id: artworkId },
    data: {
      claimStatus: "UNCLAIMED",
      artistId: null,
      rejectedAt: new Date(),
    },
  });

  // Decrement artist counter if artist existed
  if (artwork.artist?.artistName) {
    console.log("[ARTWORK] Decrementing artist count:", artwork.artist.artistName);
    // Find the artist record and decrement
    const artist = await prisma.artist.findUnique({
      where: { name: artwork.artist.artistName },
    });
    if (artist) {
      await updateArtistCount(artist.id, -1);
    }
  }

  // Decrement year counter if year provided
  if (artwork.yearCreated) {
    console.log("[ARTWORK] Decrementing year count:", artwork.yearCreated);
    const artworkYear = await prisma.artworkYear.findUnique({
      where: { year: artwork.yearCreated },
    });
    if (artworkYear) {
      await updateYearCount(artworkYear.id, -1);
    }
  }

  return updated;
}

export async function unclaimArtwork(artworkId: string, artistId: string) {
  const prisma = await prismaClient();

  // Only allow unclaiming if the artist is the one who claimed it
  const artwork = await prisma.artwork.findUnique({
    where: { id: artworkId },
  });

  if (!artwork || artwork.artistId !== artistId || artwork.claimStatus !== "PENDING_APPROVAL") {
    throw new Error("You can only unclaim your own pending claims");
  }

  return prisma.artwork.update({
    where: { id: artworkId },
    data: {
      claimStatus: "UNCLAIMED",
      artistId: null,
    },
  });
}

export async function getPendingClaimsCount(artistId: string) {
  const prisma = await prismaClient();

  return prisma.artwork.count({
    where: {
      artistId,
      claimStatus: "PENDING_APPROVAL",
    },
  });
}

export async function isArtistInCooldown(artworkId: string, artistId: string) {
  const prisma = await prismaClient();
  const COOLDOWN_DAYS = 14;

  const artwork = await prisma.artwork.findUnique({
    where: { id: artworkId },
    select: { rejectedAt: true, artistId: true },
  });

  if (!artwork || artwork.rejectedAt === null) {
    return false;
  }

  // Check if the artwork was previously claimed/rejected by this artist
  if (artwork.artistId !== artistId) {
    return false;
  }

  const now = new Date();
  const rejectedDate = new Date(artwork.rejectedAt);
  const daysSinceRejection = Math.floor(
    (now.getTime() - rejectedDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  return daysSinceRejection < COOLDOWN_DAYS;
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

export async function findDuplicateArtworkNearby(
  latitude: number,
  longitude: number,
  radiusMeters = PROXIMITY_RADIUS_METERS
) {
  const prisma = await prismaClient();

  const nearbyArtworks = await prisma.artwork.findMany({
    where: {
      // Find artworks within the proximity radius
    },
    include: {
      createdBy: true,
      artist: true,
      photos: {
        take: 1,
        orderBy: {
          uploadedAt: "desc",
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  // Filter by distance and return the closest one
  const nearby = nearbyArtworks.filter((artwork) =>
    calculateDistance(latitude, longitude, artwork.latitude, artwork.longitude) <=
    radiusMeters
  );

  return nearby.length > 0 ? nearby[0] : null;
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

export async function getAllArtworks(options?: {
  search?: string;
  claimStatus?: string;
  limit?: number;
  offset?: number;
}) {
  const prisma = await prismaClient();

  const where: any = {};

  // Search by title or address
  if (options?.search) {
    where.OR = [
      { title: { contains: options.search, mode: "insensitive" } },
      { address: { contains: options.search, mode: "insensitive" } },
    ];
  }

  // Filter by claim status
  if (options?.claimStatus && options.claimStatus !== "ALL") {
    where.claimStatus = options.claimStatus;
  }

  const offset = options?.offset || 0;
  const limit = options?.limit || 50;

  const [artworks, total] = await Promise.all([
    prisma.artwork.findMany({
      where,
      include: {
        createdBy: true,
        artist: true,
        photos: {
          take: 1,
          orderBy: {
            uploadedAt: "desc",
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      skip: offset,
      take: limit,
    }),
    prisma.artwork.count({ where }),
  ]);

  return {
    artworks,
    total,
    limit,
    offset,
    hasMore: offset + limit < total,
  };
}
