import { type ActionFunction, redirect, useActionData } from "react-router";
import { type LoaderFunction } from "react-router";
import { useRef, useState, useEffect } from "react";
import { getAuthTokenFromCookie, getUserFromToken } from "~/lib/auth.server";
import { useTheme } from "~/lib/useTheme";
import "leaflet/dist/leaflet.css";

type ActionData = {
  error?: string;
  success?: boolean;
  artworkId?: string;
  duplicateWarning?: boolean;
  nearbyArtwork?: {
    id: string;
    title: string;
    address?: string | null;
    latitude: number;
    longitude: number;
    claimStatus: string;
    artistId?: string | null;
    photos: Array<{
      photoUrl: string;
    }>;
  };
  currentUserId?: string;
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
  const latitude = parseFloat(formData.get("latitude") as string);
  const longitude = parseFloat(formData.get("longitude") as string);
  const address = formData.get("address") as string;
  const skipDupCheck = formData.get("skipDupCheck") === "true";

  if (isNaN(latitude) || isNaN(longitude)) {
    return { error: "Coordinates are required" };
  }

  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    return { error: "Invalid coordinates" };
  }

  try {
    const { createArtwork, findDuplicateArtworkNearby } = await import("~/lib/artworks.server");

    // Check for nearby artworks (dedup detection)
    if (!skipDupCheck) {
      const nearby = await findDuplicateArtworkNearby(latitude, longitude);

      if (nearby) {
        console.log("[REGISTER] Found nearby artwork:", nearby.id);
        return {
          duplicateWarning: true,
          currentUserId: user.id,
          nearbyArtwork: {
            id: nearby.id,
            title: nearby.title,
            address: nearby.address,
            latitude: nearby.latitude,
            longitude: nearby.longitude,
            claimStatus: nearby.claimStatus,
            artistId: nearby.artistId,
            photos: nearby.photos.map((p) => ({ photoUrl: p.photoUrl })),
          },
        };
      }
    }

    const artwork = await createArtwork(latitude, longitude, user.id, {
      address: address || undefined,
    });

    console.log("[REGISTER] Created artwork:", artwork.id);
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
  const { scheme, noiseColor } = useTheme();
  const formRef = useRef<HTMLFormElement>(null);
  const mapRef = useRef<MapInstance>(null);
  const [L, setL] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [selectedCoords, setSelectedCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [address, setAddress] = useState<string>("");
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [geocodingAddress, setGeocodingAddress] = useState<string>("");
  const [showDupModal, setShowDupModal] = useState(false);

  // Initialize Leaflet
  useEffect(() => {
    import("leaflet").then((leaflet) => {
      setL(leaflet);
    });
  }, []);

  // Reverse geocode when coordinates change
  useEffect(() => {
    if (selectedCoords && !address) {
      reverseGeocodeCoordinates(selectedCoords.lat, selectedCoords.lng);
    }
  }, [selectedCoords]);

  // Show duplicate warning if present in action data
  useEffect(() => {
    if (actionData?.duplicateWarning) {
      setShowDupModal(true);
    }
  }, [actionData?.duplicateWarning]);

  // Reset success state to allow new registrations
  useEffect(() => {
    if (actionData?.success) {
      // Redirect will happen via page navigation
    }
  }, [actionData?.success]);

  // Initialize map
  useEffect(() => {
    if (!L || !mapRef.current) return;

    // Initialize map centered on user location or default
    const center = userLocation || { lat: 34.0522, lng: -118.2437 }; // LA default
    const initialZoom = userLocation ? 16 : 14;
    const map = L.map(mapRef.current, {
      scrollWheelZoom: false,
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

  const reverseGeocodeCoordinates = async (lat: number, lng: number) => {
    try {
      setGeocodingAddress("Loading address...");
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18`,
        {
          headers: {
            "User-Agent": "wandergraff-app",
          },
        }
      );

      if (!response.ok) {
        setGeocodingAddress("Unable to get address");
        return;
      }

      const data = await response.json();

      if (data.address) {
        const addrObj = data.address;
        let addressString: string;

        if (addrObj.house_number && addrObj.road) {
          addressString = `${addrObj.house_number} ${addrObj.road}, ${addrObj.city || addrObj.town || addrObj.village || ""}`;
        } else if (addrObj.road) {
          addressString = `${addrObj.road}, ${addrObj.city || addrObj.town || addrObj.village || ""}`;
        } else if (addrObj.amenity) {
          addressString = `${addrObj.amenity}, ${addrObj.city || addrObj.town || addrObj.village || ""}`;
        } else if (addrObj.shop) {
          addressString = `${addrObj.shop}, ${addrObj.city || addrObj.town || addrObj.village || ""}`;
        } else {
          addressString = `${addrObj.city || addrObj.town || addrObj.village || addrObj.county || "Unknown Location"}`;
        }

        setGeocodingAddress(addressString.trim());
        setAddress(addressString.trim());
      } else {
        setGeocodingAddress("Unknown location");
      }
    } catch (error) {
      console.error("Geocoding error:", error);
      setGeocodingAddress("Unable to get address");
    }
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    if (!selectedCoords) {
      alert("Please click on the map to select the artwork location");
      e.preventDefault();
      return;
    }

    setLoading(true);
  };

  const handleConfirmDuplicate = () => {
    // Submit form with flag to skip duplicate check
    const form = formRef.current;
    if (form) {
      const dupCheckInput = document.createElement("input");
      dupCheckInput.type = "hidden";
      dupCheckInput.name = "skipDupCheck";
      dupCheckInput.value = "true";
      form.appendChild(dupCheckInput);
      form.submit();
    }
  };

  const handleViewDuplicate = () => {
    if (actionData?.nearbyArtwork) {
      window.location.href = `/artwork/${actionData.nearbyArtwork.id}`;
    }
  };

  if (actionData?.success) {
    return (
      <div
        className="min-h-screen relative flex items-center justify-center py-12 px-4"
        suppressHydrationWarning
        style={{
          backgroundColor: scheme.primaryBg,
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='2.5' numOctaves='4' seed='2'/%3E%3CfeColorMatrix type='saturate' values='0.08'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' fill='%23${noiseColor}' filter='url(%23noise)' opacity='0.5'/%3E%3C/svg%3E")`,
          backgroundAttachment: "fixed",
        }}
      >
        <div className="max-w-md w-full text-center">
          <div className="rounded-full p-6 w-16 h-16 flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: scheme.accent + "20" }}>
            <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20" style={{ color: scheme.accent }}>
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold mb-2" style={{ color: scheme.text }}>
            Mural Pinned! 📍
          </h2>
          <p className="mb-6" style={{ color: scheme.divider }}>
            Your mural has been successfully pinned to the map.
          </p>
          <div className="flex gap-4">
            <a
              href={`/artwork/upload?artworkId=${actionData.artworkId}`}
              className="flex-1 text-white px-4 py-2 rounded-lg font-medium hover:opacity-90 transition-opacity"
              style={{ backgroundColor: scheme.accent }}
            >
              Upload Photo
            </a>
            <a
              href="/"
              className="flex-1 px-4 py-2 rounded-lg font-medium transition-colors border-2"
              style={{
                borderColor: scheme.divider,
                color: scheme.text,
                backgroundColor: scheme.primaryBg,
              }}
            >
              Back Home
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen relative py-12 px-4"
      suppressHydrationWarning
      style={{
        backgroundColor: scheme.primaryBg,
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='2.5' numOctaves='4' seed='2'/%3E%3CfeColorMatrix type='saturate' values='0.08'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' fill='%23${noiseColor}' filter='url(%23noise)' opacity='0.5'/%3E%3C/svg%3E")`,
        backgroundAttachment: "fixed",
      }}
    >
      <div className="max-w-4xl mx-auto">
        <div className="rounded-lg shadow-md overflow-hidden border-2" style={{ backgroundColor: scheme.secondaryBg, borderColor: scheme.divider }}>
          {/* Header */}
          <div className="px-8 py-6 border-b-2" style={{ backgroundColor: scheme.accent, borderColor: scheme.accent }}>
            <h1 className="text-3xl font-bold text-white">📍 Pin a Mural</h1>
            <p className="text-white/80 mt-2">Click on the map to pinpoint the location of the street art</p>
          </div>

          {/* Content */}
          <div className="p-8">
            {actionData?.error && (
              <div className="rounded-lg p-4 border-2 mb-6" style={{ backgroundColor: scheme.primaryBg, borderColor: scheme.accent, color: scheme.accent }}>
                <p className="text-sm font-medium">{actionData.error}</p>
              </div>
            )}

            <form ref={formRef} method="POST" onSubmit={handleSubmit} className="flex flex-col space-y-6">
              {/* Map */}
              <div className="flex flex-col">
                <label className="text-sm font-semibold mb-3 uppercase tracking-wide" style={{ color: scheme.text }}>
                  📍 Artwork Location
                </label>
                <div
                  ref={mapRef}
                  className="w-full rounded-lg border-2"
                  style={{ height: "400px", borderColor: scheme.divider, backgroundColor: scheme.primaryBg }}
                />
                {selectedCoords && (
                  <div className="mt-4 p-4 rounded-lg border-2" style={{ backgroundColor: scheme.primaryBg, borderColor: scheme.accent }}>
                    <p className="text-sm font-semibold mb-2 uppercase tracking-wide" style={{ color: scheme.divider }}>
                      📍 Location Address
                    </p>
                    <p className="text-lg font-medium" style={{ color: scheme.text }}>
                      {geocodingAddress}
                    </p>
                    <p className="text-xs font-mono mt-2" style={{ color: scheme.divider }}>
                      {selectedCoords.lat.toFixed(6)}, {selectedCoords.lng.toFixed(6)}
                    </p>
                  </div>
                )}
                <p className="text-xs mt-2" style={{ color: scheme.divider }}>
                  Click on the map to pinpoint the artwork location
                </p>
              </div>

              <input type="hidden" name="latitude" value={selectedCoords?.lat || ""} />
              <input type="hidden" name="longitude" value={selectedCoords?.lng || ""} />
              <input type="hidden" name="address" value={address || ""} />

              <div className="flex gap-4 pt-4">
                <a
                  href="/"
                  className="flex-1 px-4 py-2 rounded-lg text-center font-medium border-2 transition-colors hover:opacity-80"
                  style={{
                    borderColor: scheme.divider,
                    color: scheme.text,
                    backgroundColor: scheme.primaryBg,
                  }}
                >
                  Cancel
                </a>
                <button
                  type="submit"
                  disabled={!selectedCoords || loading}
                  className="flex-1 text-white px-4 py-2 rounded-lg font-medium transition-all disabled:opacity-50 hover:opacity-90"
                  style={{ backgroundColor: scheme.accent }}
                >
                  {loading ? "Pinning..." : "📍 Pin Mural"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Duplicate Warning Modal */}
      {showDupModal && actionData?.nearbyArtwork && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="rounded-lg shadow-lg max-w-md w-full overflow-hidden border-2" style={{ backgroundColor: scheme.secondaryBg, borderColor: scheme.divider }}>
            <div className="border-b-2 px-6 py-4" style={{ backgroundColor: scheme.accent, borderColor: scheme.accent }}>
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                Artwork Already Nearby
              </h3>
            </div>

            <div className="p-6">
              <p className="mb-4" style={{ color: scheme.text }}>
                We found an artwork pinned very close to this location:
              </p>

              {/* Preview of nearby artwork */}
              <div className="rounded-lg p-4 mb-6 border-2" style={{ backgroundColor: scheme.primaryBg, borderColor: scheme.divider }}>
                {actionData.nearbyArtwork.photos && actionData.nearbyArtwork.photos[0] && (
                  <img
                    src={actionData.nearbyArtwork.photos[0].photoUrl}
                    alt={actionData.nearbyArtwork.title}
                    className="w-full h-40 object-cover rounded-md mb-3"
                  />
                )}
                <h4 className="font-semibold text-sm mb-1" style={{ color: scheme.text }}>
                  {actionData.nearbyArtwork.title}
                </h4>
                {actionData.nearbyArtwork.address && (
                  <p className="text-xs mb-2" style={{ color: scheme.divider }}>
                    📍 {actionData.nearbyArtwork.address}
                  </p>
                )}
                {(() => {
                  const isClaimMaker = actionData.currentUserId === actionData.nearbyArtwork.artistId && actionData.nearbyArtwork.claimStatus === "PENDING_APPROVAL";
                  const displayStatus = isClaimMaker ? actionData.nearbyArtwork.claimStatus : (actionData.nearbyArtwork.claimStatus === "PENDING_APPROVAL" ? "UNCLAIMED" : actionData.nearbyArtwork.claimStatus);
                  const statusColors = {
                    CLAIMED: { bg: "bg-green-100", text: "text-green-800" },
                    PENDING_APPROVAL: { bg: "bg-yellow-100", text: "text-yellow-800" },
                    UNCLAIMED: { bg: "bg-gray-100", text: "text-gray-800" },
                  };

                  const colors = statusColors[displayStatus as keyof typeof statusColors] || statusColors.UNCLAIMED;

                  return (
                    <span className={`text-xs font-medium px-2 py-1 rounded ${colors.bg} ${colors.text}`}>
                      {displayStatus === "CLAIMED" ? "Claimed" :
                       displayStatus === "PENDING_APPROVAL" ? "Pending Approval" : "Unclaimed"}
                    </span>
                  );
                })()}
              </div>

              <p className="text-sm mb-6" style={{ color: scheme.divider }}>
                Is this the same artwork you're trying to pin? If so, you can contribute photos to it instead of creating a duplicate.
              </p>

              <div className="flex gap-3">
                <button
                  onClick={handleViewDuplicate}
                  className="flex-1 text-white px-4 py-2 rounded-lg font-medium text-sm hover:opacity-90 transition-opacity"
                  style={{ backgroundColor: scheme.accent }}
                >
                  View It
                </button>
                <button
                  onClick={() => {
                    setShowDupModal(false);
                  }}
                  className="flex-1 border-2 px-4 py-2 rounded-lg font-medium text-sm hover:opacity-80 transition-opacity"
                  style={{
                    borderColor: scheme.divider,
                    color: scheme.text,
                    backgroundColor: scheme.primaryBg,
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmDuplicate}
                  className="flex-1 text-white px-4 py-2 rounded-lg font-medium text-sm hover:opacity-90 transition-opacity"
                  style={{ backgroundColor: scheme.accent }}
                >
                  Create New
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
