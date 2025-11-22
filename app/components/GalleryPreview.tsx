import { useState } from "react";
import { useTheme } from "~/lib/useTheme";

export interface GalleryPreviewProps {
  photos: Array<{
    id: string;
    photoUrl: string;
    user: { name: string; id: string };
    uploadedAt: string;
  }>;
  onAddPhotosClick?: () => void;
}

const VISIBLE_COUNT = 5; // Featured (2 rows) + 3 on first row + 1 on second row = 5 visible items before expand

export function GalleryPreview({ photos, onAddPhotosClick }: GalleryPreviewProps) {
  const { scheme } = useTheme();

  if (photos.length === 0) {
    return null;
  }

  const visiblePhotos = photos.slice(0, VISIBLE_COUNT);
  const hasMore = photos.length > VISIBLE_COUNT;
  const hiddenCount = photos.length - VISIBLE_COUNT;

  return (
    <div className="grid gap-3" style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(4, 1fr)',
      gridAutoRows: '160px',
      gridAutoFlow: 'dense'
    }}>
      {/* Featured item - takes 2 rows */}
      {photos[0] && (
        <div
          key={photos[0].id}
          style={{
            gridColumn: '1 / 2',
            gridRow: 'span 2',
          }}
          className="relative rounded-lg overflow-hidden bg-gray-200 group cursor-pointer hover:shadow-lg transition-shadow"
        >
          <img
            src={photos[0].photoUrl}
            alt="Featured"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-colors flex items-end p-3">
            <div className="text-white opacity-0 group-hover:opacity-100 transition-opacity">
              <p className="text-xs text-gray-200">by {photos[0].user.name}</p>
              <p className="text-xs text-gray-300">
                {new Date(photos[0].uploadedAt).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Regular items */}
      {visiblePhotos.slice(1).map((photo) => (
        <div
          key={photo.id}
          className="relative rounded-lg overflow-hidden bg-gray-200 group cursor-pointer hover:shadow-lg transition-shadow"
        >
          <img
            src={photo.photoUrl}
            alt="Gallery"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-colors flex items-end p-3">
            <div className="text-white opacity-0 group-hover:opacity-100 transition-opacity">
              <p className="text-xs text-gray-200">by {photo.user.name}</p>
              <p className="text-xs text-gray-300">
                {new Date(photo.uploadedAt).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>
      ))}

      {/* Add button - only if there are more items or we can add photos */}
      {(hasMore || onAddPhotosClick) && (
        <button
          onClick={onAddPhotosClick}
          className="relative rounded-lg overflow-hidden bg-gray-200 group cursor-pointer hover:shadow-lg transition-shadow flex items-center justify-center"
          style={{
            gridColumn: `${Math.min(4, visiblePhotos.length)} / -1`,
            gridRow: Math.ceil((visiblePhotos.length - 1) / 3) + 1
          }}
        >
          <div className="absolute inset-0" style={{ backgroundColor: scheme.accent, opacity: 0.1 }} />
          <div className="relative flex flex-col items-center gap-2">
            <div className="text-4xl font-light" style={{ color: scheme.accent }}>+</div>
            {hasMore && (
              <div className="text-xs font-medium" style={{ color: scheme.text }}>
                {hiddenCount} more
              </div>
            )}
          </div>
        </button>
      )}
    </div>
  );
}
