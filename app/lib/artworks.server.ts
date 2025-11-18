import { calculateDistance, isValidCoordinates } from "./geo";

// Database operations are deferred until Prisma is properly integrated

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
  // TODO: Implement with Prisma
  throw new Error("Artwork creation not yet implemented");
}

export async function getArtwork(id: string) {
  // TODO: Implement with Prisma
  throw new Error("Artwork retrieval not yet implemented");
}

export async function updateArtwork(
  id: string,
  data: {
    title?: string;
    description?: string;
    yearCreated?: number;
  }
) {
  // TODO: Implement with Prisma
  throw new Error("Artwork update not yet implemented");
}

export async function claimArtwork(artworkId: string, artistId: string) {
  // TODO: Implement with Prisma
  throw new Error("Artwork claim not yet implemented");
}

export async function approveClaim(artworkId: string) {
  // TODO: Implement with Prisma
  throw new Error("Claim approval not yet implemented");
}

export async function rejectClaim(artworkId: string) {
  // TODO: Implement with Prisma
  throw new Error("Claim rejection not yet implemented");
}

export async function findNearbyArtworks(
  latitude: number,
  longitude: number,
  radiusMeters = PROXIMITY_RADIUS_METERS
) {
  // TODO: Implement with Prisma
  throw new Error("Nearby artworks search not yet implemented");
}

export async function getArtworksInBounds(
  minLat: number,
  maxLat: number,
  minLon: number,
  maxLon: number,
  limit = 100
) {
  // TODO: Implement with Prisma
  throw new Error("Artworks in bounds retrieval not yet implemented");
}

export async function getArtworksByArtist(artistId: string) {
  // TODO: Implement with Prisma
  throw new Error("Artist artworks retrieval not yet implemented");
}

export async function getArtworksByYear(year: number) {
  // TODO: Implement with Prisma
  throw new Error("Artworks by year retrieval not yet implemented");
}

export async function getYearsWithArtworks() {
  // TODO: Implement with Prisma
  throw new Error("Years with artworks retrieval not yet implemented");
}

export async function getArtworkCountByYear(year: number) {
  // TODO: Implement with Prisma
  throw new Error("Artwork count by year retrieval not yet implemented");
}

export async function listArtists(limit = 100) {
  // TODO: Implement with Prisma
  throw new Error("Artists list retrieval not yet implemented");
}

export async function getRecentArtworks(limit = 20) {
  // TODO: Implement with Prisma
  throw new Error("Recent artworks retrieval not yet implemented");
}
