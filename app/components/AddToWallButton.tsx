import { useState, useEffect } from "react";
import { useFetcher } from "react-router";
import { createPortal } from "react-dom";

interface Wall {
  id: string;
  name: string;
  isPublic: boolean;
  items?: any[];
}

interface AddToWallButtonProps {
  artworkId: string;
  artworkTitle: string;
  className?: string;
  variant?: "button" | "icon" | "icon-brick";
}

export function AddToWallButton({
  artworkId,
  artworkTitle,
  className = "",
  variant = "button",
}: AddToWallButtonProps) {
  const [showModal, setShowModal] = useState(false);
  const [walls, setWalls] = useState<Wall[]>([]);
  const [loading, setLoading] = useState(false);
  const [addingToWallId, setAddingToWallId] = useState<string | null>(null);
  const [isAdded, setIsAdded] = useState(false);
  const fetcher = useFetcher();

  // Check if artwork is in any wall
  useEffect(() => {
    const isInAnyWall = walls.some((wall) =>
      wall.items?.some((item: any) => item.artworkId === artworkId)
    );
    setIsAdded(isInAnyWall);
  }, [walls, artworkId]);

  // Load user's walls and check if artwork is in any wall
  useEffect(() => {
    if (!loading || walls.length === 0) {
      setLoading(true);
      fetch("/api/user/walls")
        .then((res) => res.json())
        .then((data) => {
          setWalls(data.walls || []);
          setLoading(false);
        })
        .catch((err) => {
          console.error("Failed to load walls:", err);
          setLoading(false);
        });
    }
  }, []);

  const handleAddToWall = (wallId: string, wallName: string) => {
    setAddingToWallId(wallId);
    const formData = new FormData();
    formData.append("wallId", wallId);
    formData.append("artworkId", artworkId);
    fetcher.submit(formData, { method: "post", action: "/api/artwork/add-to-wall" });
  };

  // Handle fetcher response
  useEffect(() => {
    if (fetcher.data?.success) {
      setAddingToWallId(null);
      // Reload walls to reflect changes and update filled state
      setLoading(true);
      fetch("/api/user/walls")
        .then((res) => res.json())
        .then((data) => {
          setWalls(data.walls || []);
          setLoading(false);
        });
      setTimeout(() => setShowModal(false), 1000);
    }
  }, [fetcher.data]);

  const iconClasses = "w-5 h-5 text-gray-600 hover:text-gray-900";

  if (variant === "icon") {
    return (
      <>
        <button
          onClick={() => setShowModal(true)}
          className={`inline-flex items-center justify-center p-2 rounded hover:bg-gray-100 transition ${className}`}
          title="Add to Wall"
        >
          <svg className="w-4 h-4 text-gray-600 hover:text-gray-900" fill="currentColor" viewBox="0 0 20 20">
            <path d="M2 4a2 2 0 012-2h12a2 2 0 012 2v12a2 2 0 01-2 2H4a2 2 0 01-2-2V4z" />
          </svg>
        </button>
        {showModal && createPortal(
          <WallModal
            artworkId={artworkId}
            artworkTitle={artworkTitle}
            walls={walls}
            loading={loading}
            addingToWallId={addingToWallId}
            fetcher={fetcher}
            onClose={() => setShowModal(false)}
            onAddToWall={handleAddToWall}
          />,
          document.body
        )}
      </>
    );
  }

  if (variant === "icon-brick") {
    return (
      <>
        <button
          onClick={() => setShowModal(true)}
          className={`inline-flex items-center justify-center p-1.5 rounded hover:bg-black/10 transition ${className}`}
          title="Add to Wall"
        >
          {isAdded ? (
            // Filled brick wall
            <svg className="w-5 h-5 text-white drop-shadow-lg" viewBox="0 0 64 64" fill="currentColor">
              <rect x="4" y="4" width="12" height="12" fill="currentColor" />
              <rect x="20" y="4" width="12" height="12" fill="currentColor" />
              <rect x="36" y="4" width="12" height="12" fill="currentColor" />
              <rect x="52" y="4" width="12" height="12" fill="currentColor" />
              <rect x="12" y="20" width="12" height="12" fill="currentColor" />
              <rect x="28" y="20" width="12" height="12" fill="currentColor" />
              <rect x="44" y="20" width="12" height="12" fill="currentColor" />
              <rect x="4" y="36" width="12" height="12" fill="currentColor" />
              <rect x="20" y="36" width="12" height="12" fill="currentColor" />
              <rect x="36" y="36" width="12" height="12" fill="currentColor" />
              <rect x="52" y="36" width="12" height="12" fill="currentColor" />
              <rect x="12" y="52" width="12" height="12" fill="currentColor" />
              <rect x="28" y="52" width="12" height="12" fill="currentColor" />
              <rect x="44" y="52" width="12" height="12" fill="currentColor" />
            </svg>
          ) : (
            // Outlined brick wall
            <svg className="w-5 h-5 text-white drop-shadow-lg" viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="4" y="4" width="12" height="12" />
              <rect x="20" y="4" width="12" height="12" />
              <rect x="36" y="4" width="12" height="12" />
              <rect x="52" y="4" width="12" height="12" />
              <rect x="12" y="20" width="12" height="12" />
              <rect x="28" y="20" width="12" height="12" />
              <rect x="44" y="20" width="12" height="12" />
              <rect x="4" y="36" width="12" height="12" />
              <rect x="20" y="36" width="12" height="12" />
              <rect x="36" y="36" width="12" height="12" />
              <rect x="52" y="36" width="12" height="12" />
              <rect x="12" y="52" width="12" height="12" />
              <rect x="28" y="52" width="12" height="12" />
              <rect x="44" y="52" width="12" height="12" />
            </svg>
          )}
        </button>
        {showModal && createPortal(
          <WallModal
            artworkId={artworkId}
            artworkTitle={artworkTitle}
            walls={walls}
            loading={loading}
            addingToWallId={addingToWallId}
            fetcher={fetcher}
            onClose={() => setShowModal(false)}
            onAddToWall={handleAddToWall}
          />,
          document.body
        )}
      </>
    );
  }

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className={`inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition ${className}`}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 4v16m8-8H4"
          />
        </svg>
        Add to Wall
      </button>

      {showModal && createPortal(
        <WallModal
          artworkId={artworkId}
          artworkTitle={artworkTitle}
          walls={walls}
          loading={loading}
          addingToWallId={addingToWallId}
          fetcher={fetcher}
          onClose={() => setShowModal(false)}
          onAddToWall={handleAddToWall}
        />,
        document.body
      )}
    </>
  );
}

interface WallModalProps {
  artworkId: string;
  artworkTitle: string;
  walls: Wall[];
  loading: boolean;
  addingToWallId: string | null;
  fetcher: any;
  onClose: () => void;
  onAddToWall: (wallId: string, wallName: string) => void;
}

function WallModal({
  artworkId,
  artworkTitle,
  walls,
  loading,
  addingToWallId,
  fetcher,
  onClose,
  onAddToWall,
}: WallModalProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-lg max-w-sm w-full max-h-[80vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                <path d="M2 4a2 2 0 012-2h12a2 2 0 012 2v12a2 2 0 01-2 2H4a2 2 0 01-2-2V4z" />
              </svg>
              <h3 className="text-lg font-semibold text-gray-900">Add to Wall</h3>
            </div>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
          </div>
          <p className="text-sm text-gray-600 mt-2">{artworkTitle}</p>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : walls.length === 0 ? (
            <div className="text-center py-8">
              <svg className="w-12 h-12 text-gray-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                />
              </svg>
              <p className="text-gray-600 text-sm mb-4">You haven't created any walls yet</p>
              <a
                href="/collection/new"
                className="inline-block px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition"
              >
                Create Your First Wall
              </a>
            </div>
          ) : (
            <div className="space-y-2">
              {walls.map((wall) => (
                <button
                  key={wall.id}
                  onClick={() => onAddToWall(wall.id, wall.name)}
                  disabled={addingToWallId === wall.id}
                  className="w-full text-left p-3 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition disabled:opacity-50"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{wall.name}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {wall.items?.length || 0} artworks • {wall.isPublic ? "Public" : "Private"}
                      </p>
                    </div>
                    {addingToWallId === wall.id && (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 ml-2"></div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {fetcher.data?.success && (
          <div className="bg-green-50 border-t border-green-200 px-6 py-3">
            <p className="text-sm text-green-700">✓ Added to wall successfully!</p>
          </div>
        )}
        {fetcher.data?.error && (
          <div className="bg-red-50 border-t border-red-200 px-6 py-3">
            <p className="text-sm text-red-700">{fetcher.data.error}</p>
          </div>
        )}

        {/* Close Button */}
        <div className="border-t border-gray-200 px-6 py-3 bg-gray-50">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-100 transition font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
