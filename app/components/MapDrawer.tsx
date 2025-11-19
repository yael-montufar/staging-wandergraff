import { useState, memo } from "react";
import logoBlack from "../assets/wandergraff-logo-black.png?url";
import logoWhite from "../assets/wandergraff-logo-white.png?url";
import PhotoUploadForm from "./PhotoUploadForm";

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
  artworks?: ExistingArtwork[];
  onArtworkClick?: (artwork: ExistingArtwork) => void;
  isDarkMode?: boolean;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  onBackToList?: () => void;
  onMarkerCleared?: () => void;
  onRefreshPins?: () => void;
}

function MapDrawerContent({
  scheme,
  marker,
  existingArtwork,
  user,
  onGoHome,
  isLoadingAddress,
  artworks = [],
  onArtworkClick,
  isDarkMode = false,
  onRefresh,
  isRefreshing = false,
  onBackToList,
  onMarkerCleared,
  onRefreshPins,
}: MapDrawerProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const hasContent = !!marker || !!existingArtwork;
  const isShowingDetail = !!marker || !!existingArtwork;

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
          {/* Header with Logo and Controls */}
          <div className="border-b flex items-stretch" style={{ borderColor: scheme.accent + "40" }}>
            {/* Logo - Full height, square aspect ratio, clickable to go home */}
            <button
              onClick={() => onGoHome?.()}
              style={{
                width: "64px",
                height: "64px",
                padding: "8px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: "transparent",
                border: "none",
                cursor: "pointer",
                transition: "opacity 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.opacity = "0.7";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.opacity = "1";
              }}
              title="Go back to home"
            >
              <img
                src={isDarkMode ? logoWhite : logoBlack}
                alt="Wandergraff"
                className="w-full h-full object-contain"
              />
            </button>

            {/* Spacer to push control button to right */}
            <div style={{ flex: 1 }} />

            {/* Control Button Container */}
            <div className="px-4 py-4 flex items-center justify-center gap-2">
              {/* Back to List Button (shown only when viewing detail) */}
              {isShowingDetail && onBackToList && (
                <button
                  onClick={onBackToList}
                  className="rounded-lg shadow-lg hover:scale-110 transition-all duration-300 flex items-center justify-center flex-shrink-0"
                  style={{
                    width: "40px",
                    height: "40px",
                    backgroundColor: scheme.accent,
                    color: "#fff",
                  }}
                  title="Back to artworks in view"
                >
                  {/* Back arrow icon */}
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                    <path d="M19 12H5M12 19l-7-7 7-7" />
                  </svg>
                </button>
              )}

              {/* Collapse Button (always shown) */}
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
                ) : uploadSuccess ? (
                  <div className="text-center pt-6">
                    <div className="inline-block">
                      <div
                        className="rounded-full p-3"
                        style={{ backgroundColor: scheme.accent + "20" }}
                      >
                        <svg
                          className="w-8 h-8"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                          style={{ color: scheme.accent }}
                        >
                          <path
                            fillRule="evenodd"
                            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </div>
                    </div>
                    <p className="mt-4 font-medium" style={{ color: scheme.text }}>
                      Artwork pinned! ✓
                    </p>
                    <p className="text-xs opacity-75 mt-2" style={{ color: scheme.text }}>
                      Your photo has been uploaded
                    </p>
                    <button
                      onClick={() => {
                        setUploadSuccess(false);
                        setIsUploadingPhoto(false);
                        onMarkerCleared?.();
                        onRefreshPins?.();
                        onBackToList?.();
                      }}
                      className="mt-4 w-full py-2 px-4 rounded-lg font-medium text-white transition-all"
                      style={{
                        backgroundColor: scheme.accent,
                      }}
                    >
                      ← Back to Map
                    </button>
                  </div>
                ) : isUploadingPhoto && user ? (
                  <>
                    <p
                      className="text-xs font-semibold mb-3"
                      style={{ color: scheme.text }}
                    >
                      📸 UPLOAD PHOTO TO PIN
                    </p>
                    <PhotoUploadForm
                      latitude={marker.lat}
                      longitude={marker.lng}
                      address={marker.address}
                      scheme={scheme}
                      onSuccess={(artworkId) => {
                        setUploadSuccess(true);
                      }}
                      onCancel={() => {
                        setIsUploadingPhoto(false);
                      }}
                    />
                  </>
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
                    {user ? (
                      <button
                        onClick={() => setIsUploadingPhoto(true)}
                        className="w-full py-3 px-4 rounded-lg font-semibold text-white transition-all"
                        style={{
                          backgroundColor: scheme.accent,
                        }}
                      >
                        📸 Upload Photo to Pin
                      </button>
                    ) : (
                      <form
                        method="POST"
                        action="/auth/login"
                        onSubmit={() => {
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
                    )}
                  </>
                )}
              </div>
            ) : artworks.length > 0 ? (
              /* Artwork List */
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold" style={{ color: scheme.text }}>
                    Artworks in view ({artworks.length})
                  </h3>
                  {onRefresh && (
                    <button
                      onClick={onRefresh}
                      disabled={isRefreshing}
                      className="w-10 h-10 rounded-full shadow-lg hover:scale-110 transition-all duration-300 flex items-center justify-center flex-shrink-0 text-lg font-bold"
                      style={{
                        backgroundColor: "#FF8C00",
                        color: "#fff",
                        cursor: isRefreshing ? "wait" : "pointer",
                        opacity: isRefreshing ? 0.7 : 1,
                      }}
                      title="Refresh artworks for current viewport"
                    >
                      {isRefreshing ? "..." : "🔄"}
                    </button>
                  )}
                </div>
                <div className="space-y-2">
                  {artworks.map((artwork) => (
                    <button
                      key={artwork.id}
                      onClick={() => onArtworkClick?.(artwork)}
                      className="w-full text-left p-3 rounded-lg transition-all hover:shadow-md"
                      style={{
                        backgroundColor: scheme.secondaryBg,
                        borderLeft: `3px solid ${
                          artwork.claimStatus === "CLAIMED"
                            ? scheme.accent
                            : artwork.claimStatus === "PENDING_APPROVAL"
                            ? "#FFA500"
                            : "#999999"
                        }`,
                      }}
                    >
                      {artwork.photos?.[0]?.photoUrl && (
                        <img
                          src={artwork.photos[0].photoUrl}
                          alt={artwork.title}
                          className="w-full h-24 object-cover rounded mb-2"
                        />
                      )}
                      <p className="text-sm font-medium" style={{ color: scheme.text }}>
                        {artwork.title}
                      </p>
                      {artwork.address && (
                        <p className="text-xs opacity-75 mt-1" style={{ color: scheme.text }}>
                          📍 {artwork.address}
                        </p>
                      )}
                      {artwork.artistName && (
                        <p className="text-xs opacity-75 mt-1" style={{ color: scheme.text }}>
                          ✏️ {artwork.artistName}
                        </p>
                      )}
                    </button>
                  ))}
                </div>
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

export default memo(MapDrawerContent);
