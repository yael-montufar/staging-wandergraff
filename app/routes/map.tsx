import { useEffect, useRef, useState } from "react";
import { useRouteLoaderData } from "react-router";

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

export default function MapPage() {
  const rootData = useRouteLoaderData("root") as any;
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const leafletRef = useRef<any>(null);
  const initializingRef = useRef(false);
  const [selectedScheme, setSelectedScheme] = useState<keyof typeof colorSchemes>("light");
  const [locationPermissionGranted, setLocationPermissionGranted] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [currentZoom, setCurrentZoom] = useState(2);
  const [showPinModal, setShowPinModal] = useState(false);
  const zoomThreshold = 12; // Show "Pin Artwork" button when zoom >= 12
  const userLocationMarker = useRef<any>(null);

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
          maxBounds: [[-85, -180], [85, 180]], // Prevent panning beyond world edges
          maxBoundsViscosity: 1.0, // Hard constraint on panning
        });

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
        const marker = L.circleMarker([latitude, longitude], {
          radius: 8,
          fillColor: scheme.accent,
          color: scheme.text,
          weight: 2,
          opacity: 1,
          fillOpacity: 0.8,
        }).addTo(mapInstance.current);

        userLocationMarker.current = marker;
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
        console.error("Error code:", error.code);
        console.error("Error message:", error.message);

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

  // Handle random location
  const handleRandomLocation = () => {
    if (!mapInstance.current || !leafletRef.current) return;

    const L = leafletRef.current;

    // Generate random coordinates
    const randomLat = Math.random() * 180 - 90; // -90 to 90
    const randomLon = Math.random() * 360 - 180; // -180 to 180

    mapInstance.current.setView([randomLat, randomLon], 15);

    // Remove old marker
    if (userLocationMarker.current && mapInstance.current.hasLayer(userLocationMarker.current)) {
      mapInstance.current.removeLayer(userLocationMarker.current);
    }

    // Add marker at random location
    const scheme = colorSchemes[selectedScheme];
    const marker = L.circleMarker([randomLat, randomLon], {
      radius: 8,
      fillColor: scheme.accent,
      color: scheme.text,
      weight: 2,
      opacity: 1,
      fillOpacity: 0.8,
    }).addTo(mapInstance.current);

    userLocationMarker.current = marker;
  };

  const scheme = colorSchemes[selectedScheme];

  return (
    <div className="relative w-full h-screen overflow-hidden" style={{ backgroundColor: scheme.primaryBg }}>
      {/* Map Container */}
      <div
        ref={mapContainer}
        className="w-full h-full"
        style={{
          backgroundColor: scheme.primaryBg,
        }}
      />

      {/* Error Notification */}
      {locationError && (
        <div
          className="absolute top-6 right-6 max-w-md rounded-lg shadow-lg p-4 animate-pulse"
          style={{
            backgroundColor: scheme.accent,
            color: "#fff",
            zIndex: 1001,
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

      {/* Zoom Out Indicator */}
      {currentZoom < zoomThreshold && (
        <div
          className="absolute top-6 left-1/2 transform -translate-x-1/2 rounded-lg shadow-lg px-4 py-2 text-center text-sm"
          style={{
            backgroundColor: scheme.secondaryBg,
            color: scheme.text,
            zIndex: 500,
          }}
        >
          Zoom in to pin
        </div>
      )}

      {/* Pin Artwork Button */}
      {currentZoom >= zoomThreshold && (
        <button
          onClick={() => setShowPinModal(true)}
          className="absolute bottom-6 left-1/2 transform -translate-x-1/2 px-6 py-3 rounded-lg shadow-lg font-semibold transition-all duration-200 hover:scale-105"
          style={{
            backgroundColor: scheme.accent,
            color: "#fff",
            cursor: "pointer",
            zIndex: 1000,
          }}
          title="Pin artwork at this location"
        >
          📌 Pin Artwork
        </button>
      )}

      {/* Pin Modal */}
      {showPinModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center"
          style={{ zIndex: 2000 }}
          onClick={() => setShowPinModal(false)}
        >
          <div
            className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8 max-w-md w-full mx-4"
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: scheme.secondaryBg,
              color: scheme.text,
            }}
          >
            {!rootData?.user ? (
              <>
                <h2 className="text-2xl font-bold mb-4">Pin Artwork</h2>
                <p className="mb-6 opacity-75">Sign in to pin street art on the map.</p>
                <form
                  method="POST"
                  action="/auth/login"
                  onSubmit={() => {
                    sessionStorage.setItem("auth-redirect", "/map");
                  }}
                >
                  <input type="hidden" name="provider" value="google" />
                  <button
                    type="submit"
                    className="w-full py-3 rounded-lg font-semibold flex items-center justify-center gap-2 transition-all"
                    style={{
                      backgroundColor: scheme.accent,
                      color: "#fff",
                    }}
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path
                        fill="currentColor"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="currentColor"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="currentColor"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      />
                      <path
                        fill="currentColor"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      />
                    </svg>
                    Sign in with Google
                  </button>
                </form>
                <button
                  onClick={() => setShowPinModal(false)}
                  className="w-full mt-3 py-3 rounded-lg font-semibold border-2 transition-all"
                  style={{
                    borderColor: scheme.accent,
                    color: scheme.accent,
                    backgroundColor: "transparent",
                  }}
                >
                  Cancel
                </button>
              </>
            ) : (
              <>
                <h2 className="text-2xl font-bold mb-4">Pin Artwork</h2>
                <p className="mb-4 opacity-75">Coming soon - pin artwork at this location</p>
                <button
                  onClick={() => setShowPinModal(false)}
                  className="w-full py-3 rounded-lg font-semibold"
                  style={{
                    backgroundColor: scheme.accent,
                    color: "#fff",
                  }}
                >
                  Close
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Location Button - Bottom Right */}
      <button
        onClick={handleLocationClick}
        disabled={isLocating}
        className="absolute bottom-6 right-6 w-14 h-14 rounded-full shadow-lg transition-all duration-200 flex items-center justify-center text-xl font-bold"
        style={{
          backgroundColor: locationPermissionGranted ? scheme.accent : scheme.secondaryBg,
          color: locationPermissionGranted ? "#fff" : scheme.text,
          border: `2px solid ${locationPermissionGranted ? scheme.accent : scheme.text}`,
          cursor: isLocating ? "wait" : "pointer",
          opacity: isLocating ? 0.7 : 1,
          zIndex: 1000,
        }}
        title="Request location access or recenter on your location"
      >
        {isLocating ? "..." : "🎯"}
      </button>

      {/* Random Location Button - Bottom Left */}
      <button
        onClick={handleRandomLocation}
        className="absolute bottom-6 left-6 w-14 h-14 rounded-full shadow-lg transition-all duration-200 flex items-center justify-center text-xl font-bold hover:scale-110"
        style={{
          backgroundColor: scheme.secondaryBg,
          color: scheme.text,
          border: `2px solid ${scheme.text}`,
          cursor: "pointer",
          zIndex: 1000,
        }}
        title="Zoom to a random location"
      >
        🎲
      </button>
    </div>
  );
}
