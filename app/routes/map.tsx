import { useEffect, useRef, useState } from "react";
import { useRouteLoaderData } from "react-router";
import MapDrawer from "~/components/MapDrawer";

const colorSchemes = {
  light: {
    primaryBg: "#E7E7E7",
    text: "#0E0E0E",
    secondaryBg: "#F0F0F0",
    accent: "#D24E47",
  },
  dark: {
    primaryBg: "#1A1A1A",
    text: "#F5F5F5",
    secondaryBg: "#262626",
    accent: "#D24E47",
  },
};

// Default hotspots when database is empty or API fails
const defaultHotspots = [
  { lat: 40.7128, lon: -74.006, count: 0 },
  { lat: 34.0522, lon: -118.2437, count: 0 },
  { lat: 41.8781, lon: -87.6298, count: 0 },
  { lat: 51.5074, lon: -0.1278, count: 0 },
  { lat: 48.8566, lon: 2.3522, count: 0 },
  { lat: 52.52, lon: 13.405, count: 0 },
  { lat: 41.3851, lon: 2.1734, count: 0 },
  { lat: 40.4168, lon: -3.7038, count: 0 },
  { lat: 45.4642, lon: 9.19, count: 0 },
  { lat: 43.7695, lon: 11.2558, count: 0 },
  { lat: 35.6762, lon: 139.6503, count: 0 },
  { lat: 31.2304, lon: 121.4737, count: 0 },
  { lat: -33.8688, lon: 151.2093, count: 0 },
  { lat: -23.5505, lon: -46.6333, count: 0 },
  { lat: 37.9838, lon: 23.7275, count: 0 },
  { lat: 48.1486, lon: 17.1077, count: 0 },
  { lat: 59.3293, lon: 18.0686, count: 0 },
  { lat: 55.7558, lon: 37.6173, count: 0 },
  { lat: 1.3521, lon: 103.8198, count: 0 },
  { lat: 13.7563, lon: 100.5018, count: 0 },
  { lat: -37.8136, lon: 144.9631, count: 0 },
  { lat: -33.9249, lon: 18.4241, count: 0 },
  { lat: 40.7489, lon: -73.968, count: 0 },
  { lat: 33.749, lon: -84.388, count: 0 },
  { lat: 39.7392, lon: -104.9903, count: 0 },
  { lat: 47.6062, lon: -122.3321, count: 0 },
  { lat: 37.7749, lon: -122.4194, count: 0 },
];

interface Marker {
  lat: number;
  lng: number;
  address?: string;
}

interface ExistingArtwork {
  id: string;
  title: string;
  address?: string;
  claimStatus: string;
  artistId?: string;
  artistName?: string;
  photos?: Array<{ photoUrl: string }>;
}

export default function MapPage() {
  const rootData = useRouteLoaderData("root") as any;
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const leafletRef = useRef<any>(null);
  const initializingRef = useRef(false);
  const markerInstance = useRef<any>(null);
  const artworkMarkers = useRef<Map<string, any>>(new Map());

  const [selectedScheme, setSelectedScheme] = useState<keyof typeof colorSchemes>("light");
  const [locationPermissionGranted, setLocationPermissionGranted] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [currentZoom, setCurrentZoom] = useState(2);
  const [selectedMarker, setSelectedMarker] = useState<Marker | null>(null);
  const [selectedArtwork, setSelectedArtwork] = useState<ExistingArtwork | null>(null);
  const [isLoadingAddress, setIsLoadingAddress] = useState(false);
  const [isCheckingLocation, setIsCheckingLocation] = useState(false);
  const [hotspots, setHotspots] = useState<Array<{ lat: number; lon: number; count: number }>>(
    defaultHotspots
  );

  const maxZoom = 19; // Maximum zoom level
  const userLocationMarker = useRef<any>(null);

  // Fetch hotspots from database on mount
  useEffect(() => {
    const fetchHotspots = async () => {
      try {
        const response = await fetch("/api/map/hotspots");
        if (response.ok) {
          const data = await response.json();
          if (Array.isArray(data) && data.length > 0) {
            setHotspots(data);
          }
        }
      } catch (error) {
        console.error("Failed to fetch hotspots:", error);
        // Fall back to default hotspots
      }
    };

    fetchHotspots();
  }, []);

  // Detect theme preference
  useEffect(() => {
    const stored = localStorage.getItem("wandergraff-theme");
    if (stored === "light" || stored === "dark") {
      setSelectedScheme(stored);
    } else {
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      setSelectedScheme(prefersDark ? "dark" : "light");
    }

    const handleThemeChange = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail?.theme) {
        setSelectedScheme(customEvent.detail.theme);
      }
    };

    window.addEventListener("wandergraff-theme-change", handleThemeChange);
    return () => window.removeEventListener("wandergraff-theme-change", handleThemeChange);
  }, []);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || mapInstance.current || initializingRef.current) return;

    // Mark initialization as in progress to prevent duplicate calls
    initializingRef.current = true;

    // Dynamic import of Leaflet (browser-only)
    (async () => {
      try {
        const leaflet = await import("leaflet");
        const L = leaflet.default;

        // Import Leaflet CSS
        await import("leaflet/dist/leaflet.css");

        // Store Leaflet reference for use in other functions
        leafletRef.current = L;

        const scheme = colorSchemes[selectedScheme];

        // Create map with boundary constraints
        const map = L.map(mapContainer.current, {
          zoom: 2,
          center: [20, 0],
          attributionControl: true,
          zoomControl: false, // Disable default top-left zoom control
          maxBounds: [[-85, -180], [85, 180]], // Prevent panning beyond world edges
          maxBoundsViscosity: 1.0, // Hard constraint on panning
        });

        // Add zoom control to top-right instead of default top-left
        L.control.zoom({
          position: "topright",
        }).addTo(map);

        // Add OpenStreetMap tiles
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          maxZoom: 19,
          minZoom: 2,
        }).addTo(map);

        // Track zoom level
        setCurrentZoom(map.getZoom());
        map.on("zoom", () => {
          setCurrentZoom(map.getZoom());
        });

        // Handle map clicks (only at max zoom)
        map.on("click", (e: any) => {
          if (map.getZoom() === maxZoom) {
            handleMapClick(e.latlng.lat, e.latlng.lng);
          }
        });

        mapInstance.current = map;
      } catch (error) {
        console.error("Failed to initialize map:", error);
        initializingRef.current = false;
      }
    })();

    return () => {
      // Cleanup on unmount
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
        initializingRef.current = false;
      }
    };
  }, []);

  // Reverse geocode coordinates
  const reverseGeocodeCoordinates = async (lat: number, lng: number) => {
    try {
      setIsLoadingAddress(true);
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
        {
          headers: {
            "User-Agent": "wandergraff-app",
          },
        }
      );

      if (!response.ok) {
        setIsLoadingAddress(false);
        return null;
      }

      const data = await response.json();

      if (data.address) {
        const addrObj = data.address;
        const addressParts: string[] = [];

        // House number and street
        if (addrObj.house_number) {
          addressParts.push(addrObj.house_number);
        }

        if (addrObj.road) {
          addressParts.push(addrObj.road);
        } else if (addrObj.path) {
          addressParts.push(addrObj.path);
        } else if (addrObj.pedestrian) {
          addressParts.push(addrObj.pedestrian);
        } else if (addrObj.amenity) {
          addressParts.push(addrObj.amenity);
        } else if (addrObj.shop) {
          addressParts.push(addrObj.shop);
        }

        // Add city/town
        if (addrObj.city) {
          addressParts.push(addrObj.city);
        } else if (addrObj.town) {
          addressParts.push(addrObj.town);
        } else if (addrObj.village) {
          addressParts.push(addrObj.village);
        }

        // Add postcode for specificity
        if (addrObj.postcode) {
          addressParts.push(addrObj.postcode);
        }

        const addressString = addressParts.filter(Boolean).join(", ");

        setIsLoadingAddress(false);
        return addressString.trim() || "Unknown Location";
      }

      setIsLoadingAddress(false);
      return null;
    } catch (error) {
      console.error("Geocoding error:", error);
      setIsLoadingAddress(false);
      return null;
    }
  };

  // Handle map clicks to place marker
  const handleMapClick = async (lat: number, lng: number) => {
    if (!leafletRef.current || !mapInstance.current) return;

    const L = leafletRef.current;
    const map = mapInstance.current;

    // Remove previous marker if exists
    if (markerInstance.current && map.hasLayer(markerInstance.current)) {
      map.removeLayer(markerInstance.current);
    }

    // Clear selected artwork when placing new marker
    setSelectedArtwork(null);
    setSelectedMarker(null);
    setIsCheckingLocation(true);

    // Create marker at clicked location
    const marker = L.marker([lat, lng], {
      draggable: false,
    }).addTo(map);

    markerInstance.current = marker;

    // Check if there's existing artwork at this location
    try {
      const response = await fetch("/api/artworks/check-location", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ latitude: lat, longitude: lng }),
      });

      const result = await response.json();

      if (result.found && result.artwork) {
        // Show existing artwork in drawer
        setSelectedArtwork(result.artwork);
      } else {
        // No existing artwork - show new marker form
        // Get address via reverse geocoding
        const address = await reverseGeocodeCoordinates(lat, lng);

        // Update selected marker state
        setSelectedMarker({
          lat,
          lng,
          address: address || undefined,
        });
      }
    } catch (error) {
      console.error("Error checking location:", error);

      // Fall back to showing new marker form if API fails
      const address = await reverseGeocodeCoordinates(lat, lng);
      setSelectedMarker({
        lat,
        lng,
        address: address || undefined,
      });
    } finally {
      setIsCheckingLocation(false);
    }
  };

  // Handle location permission & centering
  const handleLocationClick = () => {
    setIsLocating(true);
    setLocationError(null);

    const centerOnLocation = (latitude: number, longitude: number) => {
      if (mapInstance.current && leafletRef.current) {
        const L = leafletRef.current;
        mapInstance.current.setView([latitude, longitude], 15);

        // Remove old marker if exists
        if (userLocationMarker.current && mapInstance.current.hasLayer(userLocationMarker.current)) {
          mapInstance.current.removeLayer(userLocationMarker.current);
        }

        // Add user location marker
        const scheme = colorSchemes[selectedScheme];
        const circleMarker = L.circleMarker([latitude, longitude], {
          radius: 8,
          fillColor: scheme.accent,
          color: scheme.text,
          weight: 2,
          opacity: 1,
          fillOpacity: 0.8,
        }).addTo(mapInstance.current);

        userLocationMarker.current = circleMarker;
      }
    };

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        centerOnLocation(latitude, longitude);
        setLocationPermissionGranted(true);
        setIsLocating(false);
        setLocationError(null);
      },
      (error) => {
        console.error("Geolocation error:", error);

        let errorMsg = "Unable to get your location";

        if (error.code === error.PERMISSION_DENIED) {
          errorMsg = "Location permission denied. Enable it in browser settings.";
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          errorMsg = "Position unavailable. Check your location services.";
        } else if (error.code === error.TIMEOUT) {
          errorMsg = "Location request timed out. Try again.";
        }

        setLocationError(errorMsg);
        setIsLocating(false);
      }
    );
  };

  // Get random location from hotspots with slight variance
  const getRandomHotspotLocation = () => {
    const hotspot = hotspots[Math.floor(Math.random() * hotspots.length)];
    // Add random offset (±0.05 degrees ≈ 5.5km)
    const latOffset = (Math.random() - 0.5) * 0.1;
    const lonOffset = (Math.random() - 0.5) * 0.1;
    return {
      lat: hotspot.lat + latOffset,
      lon: hotspot.lon + lonOffset,
    };
  };

  // Handle random location
  const handleRandomLocation = () => {
    if (!mapInstance.current || !leafletRef.current) return;

    const L = leafletRef.current;

    // Get a random location from hotspots
    const location = getRandomHotspotLocation();

    mapInstance.current.setView([location.lat, location.lon], 15);

    // Remove old marker
    if (userLocationMarker.current && mapInstance.current.hasLayer(userLocationMarker.current)) {
      mapInstance.current.removeLayer(userLocationMarker.current);
    }

    // Add marker at random location
    const scheme = colorSchemes[selectedScheme];
    const marker = L.circleMarker([location.lat, location.lon], {
      radius: 8,
      fillColor: scheme.accent,
      color: scheme.text,
      weight: 2,
      opacity: 1,
      fillOpacity: 0.8,
    }).addTo(mapInstance.current);

    userLocationMarker.current = marker;
  };

  const handleGoHome = () => {
    window.location.href = "/";
  };

  const scheme = colorSchemes[selectedScheme];

  return (
    <div className="relative w-full h-screen overflow-hidden" style={{ backgroundColor: scheme.primaryBg }}>
      {/* Map Drawer */}
      <MapDrawer
        scheme={scheme}
        marker={selectedMarker}
        existingArtwork={selectedArtwork}
        user={rootData?.user}
        onGoHome={handleGoHome}
        isLoadingAddress={isLoadingAddress || isCheckingLocation}
      />

      {/* Map Container */}
      <div
        ref={mapContainer}
        className="w-full h-full"
        style={{
          backgroundColor: scheme.primaryBg,
          zIndex: 1,
          cursor: currentZoom === maxZoom
            ? `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32"><circle cx="16" cy="16" r="14" fill="none" stroke="%23D24E47" stroke-width="2"/><circle cx="16" cy="16" r="3" fill="%23D24E47"/></svg>') 16 16, auto`
            : "grab",
        }}
      />

      {/* Error Notification */}
      {locationError && (
        <div
          className="absolute top-6 right-6 max-w-md rounded-lg shadow-lg p-4 animate-pulse"
          style={{
            backgroundColor: scheme.accent,
            color: "#fff",
            zIndex: 100,
          }}
        >
          <p className="text-sm font-medium">{locationError}</p>
          <button
            onClick={() => setLocationError(null)}
            className="mt-2 text-xs underline opacity-90 hover:opacity-100"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Zoom Indicator */}
      {currentZoom < maxZoom && (
        <div
          className="absolute top-6 left-1/2 transform -translate-x-1/2 rounded-lg shadow-lg px-4 py-2 text-center text-sm"
          style={{
            backgroundColor: scheme.secondaryBg,
            color: scheme.text,
            zIndex: 100,
          }}
        >
          Zoom in all the way to drop a pin
        </div>
      )}

      {/* Bottom Right Control Buttons */}
      <div className="absolute bottom-6 right-6 flex gap-2 z-100">
        {/* Random Location Button */}
        <button
          onClick={handleRandomLocation}
          className="w-14 h-14 rounded-full shadow-lg transition-all duration-200 flex items-center justify-center text-xl font-bold hover:scale-110"
          style={{
            backgroundColor: scheme.secondaryBg,
            color: scheme.text,
            border: `2px solid ${scheme.text}`,
            cursor: "pointer",
            zIndex: 100,
          }}
          title="Zoom to a random location"
        >
          🎲
        </button>

        {/* Location Button */}
        <button
          onClick={handleLocationClick}
          disabled={isLocating}
          className="w-14 h-14 rounded-full shadow-lg transition-all duration-200 flex items-center justify-center text-xl font-bold"
          style={{
            backgroundColor: locationPermissionGranted ? scheme.accent : scheme.secondaryBg,
            color: locationPermissionGranted ? "#fff" : scheme.text,
            border: `2px solid ${locationPermissionGranted ? scheme.accent : scheme.text}`,
            cursor: isLocating ? "wait" : "pointer",
            opacity: isLocating ? 0.7 : 1,
            zIndex: 100,
          }}
          title="Request location access or recenter on your location"
        >
          {isLocating ? "..." : "🎯"}
        </button>
      </div>
    </div>
  );
}
