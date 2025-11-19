import { db } from "./db.server";
import { extractCountryFromCoordinates } from "./geocoding.server";

/**
 * Automatically create or get a country based on coordinates
 * Called when an artwork is registered
 */
export async function ensureCountryExists(
  latitude: number,
  longitude: number
): Promise<string | null> {
  try {
    // Extract country from coordinates
    const countryName = await extractCountryFromCoordinates(latitude, longitude);

    if (!countryName) {
      console.log("[CURATION] Could not determine country from coordinates");
      return null;
    }

    // Create or get the country
    const country = await db.country.upsert({
      where: { name: countryName },
      update: {
        artworkCount: {
          increment: 1,
        },
      },
      create: {
        name: countryName,
        artworkCount: 1,
      },
    });

    return country.id;
  } catch (error) {
    console.error("[CURATION] Error ensuring country exists:", error);
    return null;
  }
}

/**
 * Automatically create or get an artist based on user claim
 * Called when an artwork is claimed by an artist
 */
export async function ensureArtistExists(artistName: string): Promise<string | null> {
  if (!artistName || artistName.trim().length === 0) {
    return null;
  }

  try {
    const normalizedName = artistName.trim();

    // Create or get the artist
    const artist = await db.artist.upsert({
      where: { name: normalizedName },
      update: {
        artworkCount: {
          increment: 1,
        },
      },
      create: {
        name: normalizedName,
        artworkCount: 1,
      },
    });

    return artist.id;
  } catch (error) {
    console.error("[CURATION] Error ensuring artist exists:", error);
    return null;
  }
}

/**
 * Automatically create or get a year based on artwork creation year
 * Called when an artwork is claimed with a year
 */
export async function ensureYearExists(year: number): Promise<string | null> {
  if (!year || year < 1900 || year > new Date().getFullYear()) {
    return null;
  }

  try {
    // Create or get the year
    const artworkYear = await db.artworkYear.upsert({
      where: { year },
      update: {
        artworkCount: {
          increment: 1,
        },
      },
      create: {
        year,
        artworkCount: 1,
      },
    });

    return artworkYear.id;
  } catch (error) {
    console.error("[CURATION] Error ensuring year exists:", error);
    return null;
  }
}

/**
 * Update country artwork count (decrement when an artwork is deleted)
 */
export async function updateCountryCount(countryId: string, increment: number) {
  try {
    await db.country.update({
      where: { id: countryId },
      data: {
        artworkCount: {
          increment,
        },
      },
    });
  } catch (error) {
    console.error("[CURATION] Error updating country count:", error);
  }
}

/**
 * Update artist artwork count (decrement when an artwork claim is removed)
 */
export async function updateArtistCount(artistId: string, increment: number) {
  try {
    await db.artist.update({
      where: { id: artistId },
      data: {
        artworkCount: {
          increment,
        },
      },
    });
  } catch (error) {
    console.error("[CURATION] Error updating artist count:", error);
  }
}

/**
 * Update year artwork count (decrement when an artwork claim is removed)
 */
export async function updateYearCount(yearId: string, increment: number) {
  try {
    await db.artworkYear.update({
      where: { id: yearId },
      data: {
        artworkCount: {
          increment,
        },
      },
    });
  } catch (error) {
    console.error("[CURATION] Error updating year count:", error);
  }
}
