import { useState } from "react";

interface MapMarker {
  lat: number;
  lng: number;
  address?: string;
  loading?: boolean;
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

interface MapDrawerProps {
  scheme: {
    primaryBg: string;
    secondaryBg: string;
    text: string;
    accent: string;
  };
  marker?: MapMarker | null;
  existingArtwork?: ExistingArtwork | null;
  user?: any;
  onGoHome?: () => void;
  isLoadingAddress?: boolean;
}

export default function MapDrawer({
  scheme,
  marker,
  existingArtwork,
  user,
  onGoHome,
  isLoadingAddress,
}: MapDrawerProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const hasContent = !!marker || !!existingArtwork;

  return (
    <div
      className="fixed left-0 top-0 h-full transition-all duration-300"
      style={{
        width: isExpanded ? "320px" : "48px",
        backgroundColor: isExpanded ? scheme.primaryBg : "transparent",
        zIndex: 9999,
      }}
    >
      {/* Expand Button (shown when collapsed) */}
      {!isExpanded && (
        <button
          onClick={() => setIsExpanded(true)}
          className="absolute rounded-lg shadow-lg hover:scale-110 transition-all duration-300 flex items-center justify-center"
          style={{
            top: "20px",
            left: "20px",
            width: "40px",
            height: "40px",
            backgroundColor: scheme.accent,
            color: "#fff",
            zIndex: 10000,
          }}
          title="Expand drawer"
        >
          {/* Expand icon: panel with arrow right */}
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <line x1="9" y1="3" x2="9" y2="21" />
            <polyline points="13,9 16,12 13,15" />
          </svg>
        </button>
      )}

      {/* Drawer Content */}
      {isExpanded && (
        <div
          className="w-full h-full flex flex-col border-r"
          style={{ borderColor: scheme.accent + "40" }}
        >
          {/* Header */}
          <div className="border-b px-4 py-4 flex items-center justify-between" style={{ borderColor: scheme.accent + "40" }}>
            <h2 className="text-lg font-bold" style={{ color: scheme.text }}>
              {existingArtwork ? "📍 Artwork" : "📍 Marker"}
            </h2>
            
            {/* Collapse Button (aligned within header) */}
            <button
              onClick={() => setIsExpanded(false)}
              className="rounded-lg shadow-lg hover:scale-110 transition-all duration-300 flex items-center justify-center flex-shrink-0"
              style={{
                width: "40px",
                height: "40px",
                backgroundColor: scheme.accent,
                color: "#fff",
              }}
              title="Collapse drawer"
            >
              {/* Collapse icon: panel with arrow left */}
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <line x1="9" y1="3" x2="9" y2="21" />
                <polyline points="15,9 12,12 15,15" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="overflow-y-auto flex-1 px-4 py-4">
            {existingArtwork ? (
              /* Existing Artwork Info with Preview */
              <div className="space-y-4">
                {/* Image Preview */}
                {existingArtwork.photos && existingArtwork.photos[0] && (
                  <div className="rounded-lg overflow-hidden shadow-md">
                    <img
                      src={existingArtwork.photos[0].photoUrl}
                      alt={existingArtwork.title}
                      className="w-full h-40 object-cover"
                    />
                  </div>
                )}

                {/* Title */}
                <div>
                  <h3 className="font-bold text-lg" style={{ color: scheme.text }}>
                    {existingArtwork.title}
                  </h3>
                  {existingArtwork.address && (
                    <p
                      className="text-sm mt-1 opacity-75"
                      style={{ color: scheme.text }}
                    >
                      📍 {existingArtwork.address}
                    </p>
                  )}
                </div>

                {/* Artist Info */}
                {existingArtwork.artistName && (
                  <div
                    className="text-sm p-3 rounded-lg"
                    style={{ backgroundColor: scheme.secondaryBg }}
                  >
                    <p style={{ color: scheme.text }}>
                      <span className="opacity-75">Painted by:</span>
                      <br />
                      <span className="font-semibold">{existingArtwork.artistName}</span>
                    </p>
                  </div>
                )}

                {/* Status Badge */}
                <div>
                  <span
                    className={`text-xs font-medium px-3 py-1 rounded-full inline-block ${
                      existingArtwork.claimStatus === "CLAIMED"
                        ? "bg-green-100 text-green-800"
                        : existingArtwork.claimStatus === "PENDING_APPROVAL"
                        ? "bg-yellow-100 text-yellow-800"
                        : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {existingArtwork.claimStatus === "CLAIMED"
                      ? "Claimed"
                      : existingArtwork.claimStatus === "PENDING_APPROVAL"
                      ? "Pending Approval"
                      : "Unclaimed"}
                  </span>
                </div>

                {/* Action Buttons */}
                <div className="space-y-2 pt-2">
                  <a
                    href={`/artwork/${existingArtwork.id}`}
                    className="block w-full py-2 px-4 rounded-lg font-semibold text-center text-white transition-all"
                    style={{
                      backgroundColor: scheme.accent,
                    }}
                  >
                    View Details
                  </a>

                  {user && (
                    <a
                      href={`/artwork/${existingArtwork.id}#add-to-wall`}
                      className="block w-full py-2 px-4 rounded-lg font-semibold text-center transition-all border-2"
                      style={{
                        borderColor: scheme.accent,
                        color: scheme.accent,
                        backgroundColor: "transparent",
                      }}
                    >
                      + Add to Wall
                    </a>
                  )}
                </div>
              </div>
            ) : marker ? (
              /* New Marker Info */
              <div className="space-y-4">
                {isLoadingAddress ? (
                  <div className="text-center pt-6">
                    <div className="inline-block">
                      <div
                        className="animate-spin rounded-full h-8 w-8 border-b-2"
                        style={{ borderColor: scheme.accent }}
                      ></div>
                    </div>
                    <p className="mt-4 text-sm" style={{ color: scheme.text }}>
                      Checking location...
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Coordinates */}
                    <div>
                      <p
                        className="text-xs opacity-75 mb-1"
                        style={{ color: scheme.text }}
                      >
                        COORDINATES
                      </p>
                      <p className="font-mono text-sm" style={{ color: scheme.text }}>
                        {marker.lat.toFixed(6)}, {marker.lng.toFixed(6)}
                      </p>
                    </div>

                    {/* Address */}
                    <div>
                      <p
                        className="text-xs opacity-75 mb-1"
                        style={{ color: scheme.text }}
                      >
                        ADDRESS
                      </p>
                      <p className="text-sm font-medium" style={{ color: scheme.text }}>
                        {marker.address || "Unable to load address"}
                      </p>
                    </div>

                    {/* Pin Button */}
                    {!isLoadingAddress &&
                      (user ? (
                        <form
                          method="POST"
                          action="/artwork/register"
                          className="pt-2"
                        >
                          <input type="hidden" name="latitude" value={marker.lat} />
                          <input type="hidden" name="longitude" value={marker.lng} />
                          <input
                            type="hidden"
                            name="address"
                            value={marker.address || ""}
                          />
                          <button
                            type="submit"
                            className="w-full py-3 px-4 rounded-lg font-semibold text-white transition-all"
                            style={{
                              backgroundColor: scheme.accent,
                            }}
                          >
                            📍 Pin Artwork
                          </button>
                        </form>
                      ) : (
                        <form
                          method="POST"
                          action="/auth/login"
                          className="pt-2"
                          onSubmit={() => {
                            // Save marker data in sessionStorage for redirect after login
                            if (marker) {
                              sessionStorage.setItem(
                                "pending-pin-marker",
                                JSON.stringify({
                                  lat: marker.lat,
                                  lng: marker.lng,
                                  address: marker.address,
                                })
                              );
                            }
                          }}
                        >
                          <input type="hidden" name="provider" value="google" />
                          <button
                            type="submit"
                            className="w-full py-3 px-4 rounded-lg font-semibold text-white transition-all"
                            style={{
                              backgroundColor: scheme.accent,
                            }}
                          >
                            Sign in to Pin Artwork
                          </button>
                        </form>
                      ))}
                  </>
                )}
              </div>
            ) : (
              /* Default/Empty State */
              <div className="text-center pt-8">
                <p className="text-lg opacity-75" style={{ color: scheme.text }}>
                  📍
                </p>
                <p className="mt-4 font-medium" style={{ color: scheme.text }}>
                  Click on the map to place a marker
                </p>
                <p className="text-xs opacity-50 mt-2" style={{ color: scheme.text }}>
                  (Zoom in to max level first)
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div
            className="border-t px-4 py-3"
            style={{ borderColor: scheme.accent + "40" }}
          >
            {onGoHome && (
              <button
                onClick={onGoHome}
                className="w-full py-2 px-4 rounded-lg font-medium transition-all text-center"
                style={{
                  backgroundColor: scheme.secondaryBg,
                  color: scheme.text,
                }}
              >
                ← Back Home
              </button>
            )}
          </div>
        </div>
      )}

      {/* Collapsed State - Icon on left edge */}
      {!isExpanded && hasContent && (
        <div
          className="h-full flex flex-col items-center justify-center border-r"
          style={{ borderColor: scheme.accent + "40", width: "48px" }}
        >
          <div
            className="p-2 rounded-lg"
            style={{
              backgroundColor: scheme.accent + "20",
              color: scheme.accent,
            }}
          >
            📍
          </div>
        </div>
      )}
    </div>
  );
}
