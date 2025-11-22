import { useTheme } from "~/lib/useTheme";
import { useState, useMemo } from "react";

export interface PhotoPickerModalProps {
  allPhotos: Array<{
    id: string;
    photoUrl: string;
    user: { name: string; id: string };
    uploadedAt: string;
  }>;
  selectedPhotoIds: string[];
  onClose: () => void;
  onConfirm: (selectedIds: string[]) => void;
}

export function PhotoPickerModal({
  allPhotos,
  selectedPhotoIds,
  onClose,
  onConfirm,
}: PhotoPickerModalProps) {
  const { scheme } = useTheme();
  const [searchQuery, setSearchQuery] = useState("");
  const [tempSelected, setTempSelected] = useState<Set<string>>(new Set(selectedPhotoIds));

  const filteredPhotos = useMemo(() => {
    if (!searchQuery.trim()) return allPhotos;

    const query = searchQuery.toLowerCase();
    return allPhotos.filter(
      (photo) =>
        photo.user.name.toLowerCase().includes(query) ||
        new Date(photo.uploadedAt).toLocaleDateString().includes(query)
    );
  }, [allPhotos, searchQuery]);

  const handleTogglePhoto = (photoId: string) => {
    const newSelected = new Set(tempSelected);
    if (newSelected.has(photoId)) {
      newSelected.delete(photoId);
    } else {
      newSelected.add(photoId);
    }
    setTempSelected(newSelected);
  };

  const handleConfirm = () => {
    onConfirm(Array.from(tempSelected));
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div
        className="rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col"
        style={{ backgroundColor: scheme.secondaryBg }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between p-6 border-b"
          style={{ borderColor: scheme.divider }}
        >
          <h2 className="text-xl font-bold" style={{ color: scheme.text }}>
            Select file
          </h2>
          <button
            onClick={onClose}
            className="text-2xl font-light"
            style={{ color: scheme.divider }}
          >
            ×
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-4 border-b" style={{ borderColor: scheme.divider }}>
          <input
            type="text"
            placeholder="Search files"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 rounded-lg border"
            style={{
              backgroundColor: scheme.primaryBg,
              borderColor: scheme.divider,
              color: scheme.text,
            }}
          />
        </div>

        {/* Photos Grid */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {filteredPhotos.map((photo) => {
              const isSelected = tempSelected.has(photo.id);
              return (
                <button
                  key={photo.id}
                  onClick={() => handleTogglePhoto(photo.id)}
                  className="relative rounded-lg overflow-hidden aspect-square hover:shadow-lg transition-all group"
                  style={{
                    border: isSelected ? `3px solid ${scheme.accent}` : `3px solid ${scheme.divider}`,
                  }}
                >
                  <img
                    src={photo.photoUrl}
                    alt="Photo"
                    className="w-full h-full object-cover"
                  />

                  {/* Overlay with checkbox */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                    <div
                      className="w-6 h-6 rounded border-2 flex items-center justify-center transition-all"
                      style={{
                        backgroundColor: isSelected ? scheme.accent : "transparent",
                        borderColor: isSelected ? scheme.accent : "white",
                      }}
                    >
                      {isSelected && (
                        <span className="text-white text-sm font-bold">✓</span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {filteredPhotos.length === 0 && (
            <div className="flex items-center justify-center h-64">
              <p style={{ color: scheme.divider }}>No photos found</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-end gap-3 p-6 border-t"
          style={{ borderColor: scheme.divider }}
        >
          <button
            onClick={onClose}
            className="px-6 py-2 rounded-lg font-medium transition-all"
            style={{
              backgroundColor: scheme.primaryBg,
              color: scheme.text,
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className="px-6 py-2 rounded-lg font-medium text-white transition-all"
            style={{
              backgroundColor: scheme.accent,
            }}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
