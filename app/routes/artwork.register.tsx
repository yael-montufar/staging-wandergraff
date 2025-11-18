import { type ActionFunction, redirect, useActionData } from "react-router";
import { type LoaderFunction } from "react-router";
import { useRef, useState, useEffect } from "react";
import { getAuthTokenFromCookie, getUserFromToken } from "~/lib/auth.server";
import "leaflet/dist/leaflet.css";

type ActionData = {
  error?: string;
  success?: boolean;
  artworkId?: string;
};

export const loader: LoaderFunction = ({ request }) => {
  const cookieHeader = request.headers.get("cookie");
  const token = getAuthTokenFromCookie(cookieHeader);
  
  if (!token) {
    return redirect("/auth/login");
  }
  
  return {};
};

export const action: ActionFunction = async ({ request }): Promise<ActionData | Response> => {
  if (request.method !== "POST") {
    return { error: "Method not allowed" };
  }

  const cookieHeader = request.headers.get("cookie");
  const token = getAuthTokenFromCookie(cookieHeader);
  const user = getUserFromToken(token);

  console.log("[REGISTER] Auth token from cookie:", token ? "present" : "missing");
  console.log("[REGISTER] User from token:", user);

  if (!user) {
    return { error: "Not authenticated" };
  }

  const formData = await request.formData();
  const title = formData.get("title") as string;
  const description = formData.get("description") as string;
  const latitude = parseFloat(formData.get("latitude") as string);
  const longitude = parseFloat(formData.get("longitude") as string);
  const yearCreated = formData.get("yearCreated") ? parseInt(formData.get("yearCreated") as string) : undefined;

  if (!title || isNaN(latitude) || isNaN(longitude)) {
    return { error: "Title and coordinates are required" };
  }

  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    return { error: "Invalid coordinates" };
  }

  try {
    const { createArtwork } = await import("~/lib/artworks.server");
    
    const artwork = await createArtwork(
      title,
      latitude,
      longitude,
      user.id,
      {
        description: description || undefined,
        yearCreated,
      }
    );

    return { success: true, artworkId: artwork.id };
  } catch (error) {
    console.error("[REGISTER] Error creating artwork:", error);
    return {
      error: error instanceof Error ? error.message : "Failed to create artwork",
    };
  }
};

type MapInstance = any;

export default function RegisterArtworkPage() {
  const actionData = useActionData<ActionData>();
  const formRef = useRef<HTMLFormElement>(null);
  const mapRef = useRef<MapInstance>(null);
  const [L, setL] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [yearCreated, setYearCreated] = useState(new Date().getFullYear().toString());
  const [selectedCoords, setSelectedCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

  // Initialize Leaflet
  useEffect(() => {
    import("leaflet").then((leaflet) => {
      setL(leaflet);
    });
  }, []);

  // Initialize map
  useEffect(() => {
    if (!L || !mapRef.current) return;

    // Initialize map centered on user location or default
    const center = userLocation || { lat: 34.0522, lng: -118.2437 }; // LA default
    const initialZoom = userLocation ? 16 : 14; // Zoomed in more by default
    const map = L.map(mapRef.current, {
      scrollWheelZoom: false, // Disable scroll wheel zoom to allow page scrolling
      zoomControl: true,
    }).setView([center.lat, center.lng], initialZoom);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);

    // Add marker for selected location
    let marker: any = null;
    if (selectedCoords) {
      marker = L.marker([selectedCoords.lat, selectedCoords.lng]).addTo(map);
      // Don't reset zoom when marker exists
      map.setView([selectedCoords.lat, selectedCoords.lng], map.getZoom());
    }

    // Handle map clicks
    const handleMapClick = (e: any) => {
      setSelectedCoords({
        lat: e.latlng.lat,
        lng: e.latlng.lng,
      });

      if (marker) {
        marker.setLatLng(e.latlng);
      } else {
        marker = L.marker(e.latlng).addTo(map);
      }

      // Pan to marker without changing zoom level
      const currentZoom = map.getZoom();
      map.setView(e.latlng, currentZoom, { animate: true });
    };

    map.on("click", handleMapClick);

    // Get user location (only on initial load)
    if ("geolocation" in navigator && !userLocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          setUserLocation({ lat, lng });
          // Pan to location without changing current zoom
          map.panTo([lat, lng]);
        },
        (error) => console.log("Location access denied (this is normal if you denied permission):", error)
      );
    }

    return () => {
      map.off("click", handleMapClick);
      map.remove();
    };
  }, [L, mapRef, selectedCoords, userLocation]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    if (!selectedCoords) {
      alert("Please click on the map to select the artwork location");
      e.preventDefault();
      return;
    }

    if (!title) {
      alert("Artwork title is required");
      e.preventDefault();
      return;
    }

    setLoading(true);
    // Form will submit naturally (no preventDefault)
  };

  if (actionData?.success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
        <div className="max-w-md w-full text-center">
          <div className="rounded-full bg-green-100 p-6 w-16 h-16 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Mural Pinned! 📍</h2>
          <p className="text-gray-600 mb-6">Your mural has been successfully pinned to the map.</p>
          <div className="flex gap-4">
            <a href={`/artwork/upload?artworkId=${actionData.artworkId}`} className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">
              Upload Photo
            </a>
            <a href="/" className="flex-1 bg-gray-300 text-gray-900 px-4 py-2 rounded-md hover:bg-gray-400">
              Back Home
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-8 py-6">
            <h1 className="text-3xl font-bold text-white">📍 Pin a Mural</h1>
            <p className="text-blue-100 mt-2">Click on the map to pinpoint the location and provide details about the mural</p>
          </div>

          {/* Content */}
          <div className="p-8">
            {actionData?.error && (
              <div className="rounded-md bg-red-50 p-4 border border-red-200 mb-6">
                <p className="text-sm font-medium text-red-800">{actionData.error}</p>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Map */}
              <div className="flex flex-col h-full">
                <label className="text-sm font-medium text-gray-900 mb-2">
                  📍 Artwork Location
                </label>
                <div
                  ref={mapRef}
                  className="flex-1 w-full min-h-96 rounded-lg border border-gray-300 bg-gray-100"
                  style={{ height: "400px" }}
                />
                {selectedCoords && (
                  <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded text-sm text-blue-900">
                    <p>Latitude: {selectedCoords.lat.toFixed(6)}</p>
                    <p>Longitude: {selectedCoords.lng.toFixed(6)}</p>
                  </div>
                )}
                <p className="text-xs text-gray-500 mt-2">Click on the map to pinpoint the artwork location</p>
              </div>

              {/* Form */}
              <form ref={formRef} method="POST" onSubmit={handleSubmit} className="flex flex-col space-y-4">
                <div>
                  <label htmlFor="title" className="block text-sm font-medium text-gray-900 mb-1">
                    Artwork Title *
                  </label>
                  <input
                    id="title"
                    type="text"
                    name="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g., Red Building Mural, Downtown Phoenix"
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-gray-900 mb-1">
                    Description
                  </label>
                  <textarea
                    id="description"
                    name="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe the artwork, artist, style, etc. (optional)"
                    rows={4}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label htmlFor="yearCreated" className="block text-sm font-medium text-gray-900 mb-1">
                    Year Created
                  </label>
                  <input
                    id="yearCreated"
                    type="number"
                    name="yearCreated"
                    value={yearCreated}
                    onChange={(e) => setYearCreated(e.target.value)}
                    min="1900"
                    max={new Date().getFullYear()}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <input type="hidden" name="latitude" value={selectedCoords?.lat || ""} />
                <input type="hidden" name="longitude" value={selectedCoords?.lng || ""} />

                <div className="flex gap-4 pt-4">
                  <a href="/" className="flex-1 bg-gray-300 text-gray-900 px-4 py-2 rounded-md hover:bg-gray-400 text-center font-medium">
                    Cancel
                  </a>
                  <button
                    type="submit"
                    disabled={!selectedCoords || !title || loading}
                    className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 font-medium"
                  >
                    {loading ? "Pinning..." : "📍 Pin Mural"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
