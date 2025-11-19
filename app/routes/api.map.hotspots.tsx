import { type LoaderFunction } from "react-router";
import { prismaClient } from "~/lib/db.server";

interface Hotspot {
  lat: number;
  lon: number;
  count: number;
  name?: string;
}

// Group nearby artworks into hotspots using a simple grid-based clustering
// Each grid cell is approximately 100km x 100km (0.9 degrees)
function clusterArtworks(
  artworks: Array<{ latitude: number; longitude: number }>
): Hotspot[] {
  const gridSize = 0.9; // approximately 100km at equator
  const clusters: Map<string, Hotspot> = new Map();

  for (const artwork of artworks) {
    const gridX = Math.floor(artwork.latitude / gridSize);
    const gridY = Math.floor(artwork.longitude / gridSize);
    const key = `${gridX},${gridY}`;

    if (!clusters.has(key)) {
      clusters.set(key, {
        lat: (gridX + 0.5) * gridSize,
        lon: (gridY + 0.5) * gridSize,
        count: 0,
      });
    }

    const cluster = clusters.get(key)!;
    cluster.count++;
  }

  return Array.from(clusters.values()).sort((a, b) => b.count - a.count);
}

export const loader: LoaderFunction = async () => {
  try {
    const prisma = await prismaClient();

    // Fetch all artworks with just coordinates
    const artworks = await prisma.artwork.findMany({
      select: {
        latitude: true,
        longitude: true,
      },
    });

    if (artworks.length === 0) {
      // Return default cities if no artworks exist
      const defaultHotspots: Hotspot[] = [
        { lat: 40.7128, lon: -74.006, count: 0, name: "New York" },
        { lat: 34.0522, lon: -118.2437, count: 0, name: "Los Angeles" },
        { lat: 41.8781, lon: -87.6298, count: 0, name: "Chicago" },
        { lat: 51.5074, lon: -0.1278, count: 0, name: "London" },
        { lat: 48.8566, lon: 2.3522, count: 0, name: "Paris" },
      ];
      return new Response(JSON.stringify(defaultHotspots), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Cluster artworks into hotspots
    const hotspots = clusterArtworks(artworks);

    // Return top 30 hotspots (or all if fewer than 30)
    return new Response(JSON.stringify(hotspots.slice(0, 30)), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error fetching hotspots:", error);
    // Return empty array on error, let client fall back to defaults
    return new Response(JSON.stringify([]), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
