import { useState, useRef } from "react";
import { useTheme } from "~/lib/useTheme";

export interface GalleryPreviewProps {
  photos: Array<{
    id: string;
    photoUrl: string;
    user: { name: string; id: string };
    uploadedAt: string;
  }>;
  onAddPhotosClick?: () => void;
  onReorder?: (photoIds: string[]) => void;
  onDelete?: (photoId: string) => void;
  isDraggable?: boolean;
}

export function GalleryPreview({
  photos,
  onAddPhotosClick,
  onReorder,
  onDelete,
  isDraggable = false
}: GalleryPreviewProps) {
  const { scheme } = useTheme();
  const [draggedItem, setDraggedItem] = useState<string | null>(null);
  const dragOverIndexRef = useRef<number | null>(null);

  const handleDragStart = (e: React.DragEvent, photoId: string) => {
    setDraggedItem(photoId);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    dragOverIndexRef.current = index;
  };

  const handleDragLeave = () => {
    dragOverIndexRef.current = null;
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();

    if (!draggedItem || !onReorder) return;

    const draggedIndex = photos.findIndex((p) => p.id === draggedItem);
    if (draggedIndex === -1 || draggedIndex === dropIndex) {
      setDraggedItem(null);
      dragOverIndexRef.current = null;
      return;
    }

    const newOrder = [...photos];
    newOrder.splice(draggedIndex, 1);
    newOrder.splice(dropIndex, 0, photos[draggedIndex]);
    onReorder(newOrder.map((p) => p.id));

    setDraggedItem(null);
    dragOverIndexRef.current = null;
  };

  if (photos.length === 0) {
    return null;
  }

  return (
    <div className="grid gap-3" style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(4, 1fr)',
      gridAutoRows: '160px',
      gridAutoFlow: 'dense'
    }}>
      {/* All items with drag support */}
      {photos.map((photo, index) => {
        const isFeatured = index === 0;
        const isOver = dragOverIndexRef.current === index;
        const isDragging = draggedItem === photo.id;

        return (
          <div
            key={photo.id}
            draggable={isDraggable}
            onDragStart={(e) => isDraggable && handleDragStart(e, photo.id)}
            onDragOver={(e) => isDraggable && handleDragOver(e, index)}
            onDragLeave={isDraggable ? handleDragLeave : undefined}
            onDrop={(e) => isDraggable && handleDrop(e, index)}
            style={{
              gridColumn: isFeatured ? '1 / 2' : undefined,
              gridRow: isFeatured ? 'span 2' : undefined,
              opacity: isDragging ? 0.5 : 1,
              borderColor: isOver && isDraggable ? scheme.accent : undefined,
              borderWidth: isOver && isDraggable ? '2px' : undefined,
            }}
            className={`relative rounded-lg overflow-hidden bg-gray-200 group ${isDraggable ? 'cursor-move' : 'cursor-pointer'} hover:shadow-lg transition-all`}
          >
            <img
              src={photo.photoUrl}
              alt={isFeatured ? "Featured" : "Gallery"}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-colors flex flex-col items-center justify-center gap-2">
              <div className="text-white opacity-0 group-hover:opacity-100 transition-opacity text-center">
                <p className="text-xs text-gray-200">by {photo.user.name}</p>
                <p className="text-xs text-gray-300">
                  {new Date(photo.uploadedAt).toLocaleDateString()}
                </p>
              </div>
              {onDelete && (
                <button
                  onClick={() => onDelete(photo.id)}
                  className="flex items-center justify-center w-8 h-8 rounded-full bg-red-500/90 hover:bg-red-600 transition-colors opacity-0 group-hover:opacity-100"
                  title="Delete photo"
                >
                  <span className="text-white font-bold text-lg">×</span>
                </button>
              )}
            </div>
          </div>
        );
      })}

      {/* Add button */}
      {onAddPhotosClick && (
        <button
          onClick={onAddPhotosClick}
          className="relative rounded-lg overflow-hidden bg-gray-200 group cursor-pointer hover:shadow-lg transition-shadow flex items-center justify-center"
          style={{
            gridColumn: photos.length % 3 === 0 ? '1 / 2' : undefined,
            gridRow: photos.length % 3 === 0 ? 'span 2' : undefined,
          }}
        >
          <div className="absolute inset-0" style={{ backgroundColor: scheme.accent, opacity: 0.1 }} />
          <div className="relative flex flex-col items-center gap-2">
            <div className="text-4xl font-light" style={{ color: scheme.accent }}>+</div>
          </div>
        </button>
      )}
    </div>
  );
}
