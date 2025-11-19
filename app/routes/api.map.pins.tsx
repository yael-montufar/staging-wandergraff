import { type LoaderFunction } from "react-router";
import { prismaClient } from "~/lib/db.server";

interface MapPin {
  id: string;
  latitude: number;
  longitude: number;
  title: string;
  address?: string;
  claimStatus: string;
  photoUrl?: string;
  artistName?: string;
  photos?: Array<{ photoUrl: string }>;
}

export const loader: LoaderFunction = async ({ request }) => {
  try {
    const prisma = await prismaClient();
    const url = new URL(request.url);

    // Parse viewport bounds from query parameters
    const minLat = url.searchParams.get("minLat");
    const maxLat = url.searchParams.get("maxLat");
    const minLng = url.searchParams.get("minLng");
    const maxLng = url.searchParams.get("maxLng");
    const zoom = url.searchParams.get("zoom");

    console.log("[API PINS] ====== PINS REQUEST ======");
    console.log("[API PINS] Full URL:", url.toString());
    console.log("[API PINS] Query params received:");
    console.log("[API PINS]   minLat:", minLat);
    console.log("[API PINS]   maxLat:", maxLat);
    console.log("[API PINS]   minLng:", minLng);
    console.log("[API PINS]   maxLng:", maxLng);
    console.log("[API PINS]   zoom:", zoom);

    // Build where clause for viewport filtering
    const where: any = {};
    let filterApplied = false;

    // Apply viewport filtering if bounds are provided
    if (minLat && maxLat && minLng && maxLng && zoom) {
      const zoomLevel = parseInt(zoom, 10);
      console.log("[API PINS] Zoom level parsed:", zoomLevel);

      // Always apply viewport filtering when bounds are provided
      filterApplied = true;
      where.AND = [
        { latitude: { gte: parseFloat(minLat) } },
        { latitude: { lte: parseFloat(maxLat) } },
        { longitude: { gte: parseFloat(minLng) } },
        { longitude: { lte: parseFloat(maxLng) } },
      ];
      console.log("[API PINS] ✅ FILTER APPLIED - Viewport bounds filter active");
      console.log("[API PINS] Filter details:", JSON.stringify(where, null, 2));
    } else {
      console.log("[API PINS] ❌ Filter NOT applied - missing query parameters");
      console.log("[API PINS] hasMinLat:", !!minLat, "hasMaxLat:", !!maxLat, "hasMinLng:", !!minLng, "hasMaxLng:", !!maxLng, "hasZoom:", !!zoom);
    }

    const artworks = await prisma.artwork.findMany({
      where,
      select: {
        id: true,
        latitude: true,
        longitude: true,
        title: true,
        address: true,
        claimStatus: true,
        artist: {
          select: {
            artistName: true,
          },
        },
        photos: {
          select: {
            photoUrl: true,
          },
          take: 1,
          orderBy: {
            uploadedAt: "desc",
          },
        },
      },
    });

    console.log("[API PINS] Query executed, results:", artworks.length, "artworks");
    console.log("[API PINS] Filter was applied?", filterApplied);

    const pins: MapPin[] = artworks.map((artwork) => ({
      id: artwork.id,
      latitude: artwork.latitude,
      longitude: artwork.longitude,
      title: artwork.title,
      address: artwork.address || undefined,
      claimStatus: artwork.claimStatus,
      photoUrl: artwork.photos[0]?.photoUrl,
      artistName: artwork.artist?.artistName,
      photos: artwork.photos.map((p) => ({ photoUrl: p.photoUrl })),
    }));

    return new Response(JSON.stringify(pins), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error fetching map pins:", error);
    return new Response(JSON.stringify([]), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
