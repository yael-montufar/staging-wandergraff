import { useState } from "react";
import { useTheme } from "~/lib/useTheme";

export interface CommunityGalleryProps {
  photos: Array<{
    id: string;
    photoUrl: string;
    user: { name: string; id: string };
    uploadedAt: string;
  }>;
  hasMore: boolean;
  onLoadMore: () => void;
  isLoading?: boolean;
}

export function CommunityGallery({
  photos,
  hasMore,
  onLoadMore,
  isLoading = false,
}: CommunityGalleryProps) {
  const { scheme } = useTheme();

  if (photos.length === 0) {
    return null;
  }

  return (
    <div className="mb-12">
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-1" style={{ color: scheme.text }}>
          Community Gallery
        </h2>
        <p className="text-sm" style={{ color: scheme.divider }}>
          {photos.length} photos from the community
        </p>
      </div>

      {/* 3-Column Instagram-Style Grid */}
      <div className="mb-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {photos.map((photo) => (
            <div
              key={photo.id}
              className="relative rounded-lg overflow-hidden bg-gray-200 group cursor-pointer aspect-square hover:shadow-lg transition-shadow"
            >
              <img
                src={photo.photoUrl}
                alt="Community photo"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
              />

              {/* Info overlay on hover */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-end p-3">
                <div className="text-white opacity-0 group-hover:opacity-100 transition-opacity w-full">
                  <p className="text-xs text-gray-200 truncate">
                    <a href={`/user/${photo.user.id}`} className="hover:underline">
                      {photo.user.name}
                    </a>
                  </p>
                  <p className="text-xs text-gray-300">
                    {new Date(photo.uploadedAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Load More Button */}
      {hasMore && (
        <div className="flex justify-center">
          <button
            onClick={onLoadMore}
            disabled={isLoading}
            className="px-6 py-2 rounded-lg font-medium transition-all border-2 hover:shadow-lg disabled:opacity-50"
            style={{
              borderColor: scheme.accent,
              color: scheme.accent,
            }}
          >
            {isLoading ? "Loading..." : "Load More"}
          </button>
        </div>
      )}
    </div>
  );
}
