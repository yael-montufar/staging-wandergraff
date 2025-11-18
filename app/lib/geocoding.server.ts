/**
 * Geocoding utility using OpenStreetMap Nominatim API
 * Free, no API key required, integrates well with Leaflet
 */

export async function reverseGeocode(latitude: number, longitude: number): Promise<string | null> {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18`,
      {
        headers: {
          "User-Agent": "wandergraff-app",
        },
      }
    );

    if (!response.ok) {
      console.error(`[GEOCODING] Nominatim error: ${response.status}`);
      return null;
    }

    const data = await response.json();

    // Nominatim returns address in address object
    if (data.address) {
      // Build address from components in order of specificity
      const address = data.address;
      
      // Prefer different address formats based on available data
      let addressString: string;

      // Try to build: street number + street name + suburb + city
      if (address.house_number && address.road) {
        addressString = `${address.house_number} ${address.road}, ${address.city || address.town || address.village || ""}`;
      } else if (address.road) {
        addressString = `${address.road}, ${address.city || address.town || address.village || ""}`;
      } else if (address.amenity) {
        addressString = `${address.amenity}, ${address.city || address.town || address.village || ""}`;
      } else if (address.shop) {
        addressString = `${address.shop}, ${address.city || address.town || address.village || ""}`;
      } else {
        addressString = `${address.city || address.town || address.village || address.county || "Unknown Location"}`;
      }

      return addressString.trim();
    }

    return null;
  } catch (error) {
    console.error("[GEOCODING] Error during reverse geocoding:", error);
    return null;
  }
}
