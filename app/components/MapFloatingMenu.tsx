import { useState, useRef, useEffect } from "react";

interface MapFloatingMenuProps {
  scheme: {
    primaryBg: string;
    secondaryBg: string;
    text: string;
    accent: string;
  };
  currentZoom: number;
  maxZoom: number;
  onRandomLocation: () => void;
  onLocationClick: () => void;
  isLocating: boolean;
  locationPermissionGranted: boolean;
}

export default function MapFloatingMenu({
  scheme,
  currentZoom,
  maxZoom,
  onRandomLocation,
  onLocationClick,
  isLocating,
  locationPermissionGranted,
}: MapFloatingMenuProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const needsAttention = currentZoom < maxZoom;

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsExpanded(false);
      }
    };

    if (isExpanded) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isExpanded]);

  return (
    <div
      className="absolute bottom-6 right-6"
      ref={menuRef}
      style={{
        zIndex: 10001,
        width: isExpanded ? "280px" : "56px",
        transition: "width 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
      }}
    >
      {/* Morphing Menu Container */}
      <div
        style={{
          backgroundColor: scheme.secondaryBg,
          border: `1px solid ${scheme.accent}40`,
          borderRadius: isExpanded ? "16px" : "50%",
          padding: isExpanded ? "16px" : "0px",
          boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
          transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
          display: "flex",
          flexDirection: "column",
          gap: isExpanded ? "12px" : "0px",
          minHeight: "56px",
        }}
      >
        {/* Header with close button (only when expanded) */}
        {isExpanded && (
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "8px",
            }}
          >
            <span
              style={{
                fontSize: "14px",
                fontWeight: "600",
                color: scheme.text,
              }}
            >
              Menu
            </span>
            <button
              type="button"
              onClick={() => setIsExpanded(false)}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: scheme.text,
                fontSize: "18px",
                padding: "0",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                opacity: needsAttention ? 1 : 0.6,
                position: "relative",
                transition: "opacity 0.2s",
              }}
              title="Close menu"
            >
              ✕
              {/* Attention animation on close button when message exists */}
              {needsAttention && (
                <div style={{ position: "absolute", inset: "-8px", pointerEvents: "none" }}>
                  {[0, 1].map((i) => (
                    <div
                      key={i}
                      style={{
                        position: "absolute",
                        inset: 0,
                        borderRadius: "4px",
                        border: `1.5px solid ${scheme.accent}`,
                        opacity: 0.3,
                        animation: `pulse-ring 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite`,
                        animationDelay: `${i * 0.75}s`,
                      }}
                    />
                  ))}
                </div>
              )}
            </button>
          </div>
        )}

        {/* Message (only when expanded) */}
        {isExpanded && (
          <div
            style={{
              fontSize: "13px",
              lineHeight: "1.5",
              color: scheme.text,
              padding: "8px",
              borderRadius: "8px",
              backgroundColor: needsAttention ? scheme.accent + "15" : "transparent",
              borderLeft: needsAttention ? `3px solid ${scheme.accent}` : "none",
            }}
          >
            {needsAttention
              ? "Zoom in fully to pin artwork, or use your location to explore nearby art, or use the randomizer to jump to locations."
              : "Ready to pin artwork! Click on the map to place a new pin."}
          </div>
        )}

        {/* Button Container (flex row when expanded, single button when collapsed) */}
        <div
          style={{
            display: isExpanded ? "flex" : "flex",
            flexDirection: isExpanded ? "column" : "column",
            gap: isExpanded ? "10px" : "0px",
            alignItems: "stretch",
          }}
        >
          {/* Info/Menu Button - Hidden when expanded */}
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            style={{
              width: isExpanded ? "0px" : "56px",
              height: "56px",
              borderRadius: "50%",
              border: `2px solid ${needsAttention ? scheme.accent : scheme.text}`,
              backgroundColor: needsAttention ? scheme.accent : scheme.secondaryBg,
              color: needsAttention ? "#fff" : scheme.text,
              cursor: "pointer",
              fontSize: "24px",
              fontWeight: "bold",
              display: isExpanded ? "none" : "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
              position: "relative",
              flexShrink: 0,
              padding: "0",
              overflow: "hidden",
            }}
            title={
              needsAttention
                ? "Open menu to see options"
                : "Menu"
            }
          >
            ℹ️
            {/* Circular Waves Animation - Only show when needs attention */}
            {needsAttention && !isExpanded && (
              <div style={{ position: "absolute", inset: 0, borderRadius: "50%", pointerEvents: "none" }}>
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    style={{
                      position: "absolute",
                      inset: 0,
                      borderRadius: "50%",
                      border: `2px solid ${scheme.accent}`,
                      opacity: 0.4,
                      animation: `pulse-ring 2s cubic-bezier(0.4, 0, 0.6, 1) infinite`,
                      animationDelay: `${i * 0.667}s`,
                    }}
                  />
                ))}
              </div>
            )}
          </button>

          {/* Action Buttons (only when expanded) */}
          {isExpanded && (
            <>
              {/* Random Location Button */}
              <button
                type="button"
                onClick={() => {
                  onRandomLocation();
                  setIsExpanded(false);
                }}
                style={{
                  width: "100%",
                  height: "44px",
                  borderRadius: "8px",
                  border: `2px solid ${scheme.text}`,
                  backgroundColor: scheme.secondaryBg,
                  color: scheme.text,
                  cursor: "pointer",
                  fontSize: "14px",
                  fontWeight: "600",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  transition: "all 0.2s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "scale(1.02)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "scale(1)";
                }}
                title="Zoom to a random location"
              >
                🎲 Random Location
              </button>

              {/* Location Button */}
              <button
                type="button"
                onClick={() => {
                  onLocationClick();
                  setIsExpanded(false);
                }}
                disabled={isLocating}
                style={{
                  width: "100%",
                  height: "44px",
                  borderRadius: "8px",
                  border: `2px solid ${locationPermissionGranted ? scheme.accent : scheme.text}`,
                  backgroundColor: locationPermissionGranted ? scheme.accent : scheme.secondaryBg,
                  color: locationPermissionGranted ? "#fff" : scheme.text,
                  cursor: isLocating ? "wait" : "pointer",
                  fontSize: "14px",
                  fontWeight: "600",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  transition: "all 0.2s",
                  opacity: isLocating ? 0.7 : 1,
                }}
                onMouseEnter={(e) => {
                  if (!isLocating) {
                    e.currentTarget.style.transform = "scale(1.02)";
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "scale(1)";
                }}
                title="Request location access or recenter on your location"
              >
                {isLocating ? "..." : "🎯"} Use Your Location
              </button>
            </>
          )}
        </div>
      </div>

      {/* CSS Animation Keyframes */}
      <style>{`
        @keyframes pulse-ring {
          0% {
            transform: scale(1);
            opacity: 0.6;
          }
          100% {
            transform: scale(1.4);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}
