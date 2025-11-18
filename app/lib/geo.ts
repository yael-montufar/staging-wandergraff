// Haversine formula to calculate distance between two coordinates in meters
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Earth radius in meters
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

// Check if two coordinates are within a given distance (in meters)
export function isWithinDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
  distanceMeters: number
): boolean {
  return calculateDistance(lat1, lon1, lat2, lon2) <= distanceMeters;
}

// Get bounds for a given center point and radius
export function getBounds(
  centerLat: number,
  centerLon: number,
  radiusMeters: number
) {
  const latOffset = (radiusMeters / 111320) * 1.2; // Rough conversion to degrees
  const lonOffset = (radiusMeters / (111320 * Math.cos(toRad(centerLat)))) * 1.2;

  return {
    minLat: centerLat - latOffset,
    maxLat: centerLat + latOffset,
    minLon: centerLon - lonOffset,
    maxLon: centerLon + lonOffset,
  };
}

// Validate coordinates
export function isValidCoordinates(lat: number, lon: number): boolean {
  return lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180;
}

// Simple clustering algorithm for map display
export interface ClusterPoint {
  id: string;
  lat: number;
  lon: number;
  data?: any;
}

export interface Cluster {
  lat: number;
  lon: number;
  count: number;
  items: ClusterPoint[];
}

export function clusterPoints(
  points: ClusterPoint[],
  gridSize: number = 256
): Cluster[] {
  if (points.length === 0) return [];

  const clusters: Map<string, Cluster> = new Map();

  for (const point of points) {
    const gridX = Math.floor(point.lat / gridSize);
    const gridY = Math.floor(point.lon / gridSize);
    const key = `${gridX},${gridY}`;

    if (!clusters.has(key)) {
      clusters.set(key, {
        lat: (gridX + 0.5) * gridSize,
        lon: (gridY + 0.5) * gridSize,
        count: 0,
        items: [],
      });
    }

    const cluster = clusters.get(key)!;
    cluster.count++;
    cluster.items.push(point);
  }

  return Array.from(clusters.values());
}
