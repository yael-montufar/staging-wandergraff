import { useTheme } from "~/lib/useTheme";
import { useState, useMemo, useRef } from "react";

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
  artworkId: string;
  onPhotosUploaded?: (newPhotos: Array<{
    id: string;
    photoUrl: string;
    user: { name: string; id: string };
    uploadedAt: string;
  }>) => void;
}

export function PhotoPickerModal({
  allPhotos,
  selectedPhotoIds,
  onClose,
  onConfirm,
  artworkId,
  onPhotosUploaded,
}: PhotoPickerModalProps) {
  const { scheme } = useTheme();
  const [searchQuery, setSearchQuery] = useState("");
  const [tempSelected, setTempSelected] = useState<Set<string>>(new Set(selectedPhotoIds));
  const [photos, setPhotos] = useState(allPhotos);
  const [uploadTab, setUploadTab] = useState(false);
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [uploadPreviews, setUploadPreviews] = useState<{ file: File; preview: string }[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredPhotos = useMemo(() => {
    if (!searchQuery.trim()) return photos;

    const query = searchQuery.toLowerCase();
    return photos.filter(
      (photo) =>
        photo.user.name.toLowerCase().includes(query) ||
        new Date(photo.uploadedAt).toLocaleDateString().includes(query)
    );
  }, [photos, searchQuery]);

  const handleTogglePhoto = (photoId: string) => {
    const newSelected = new Set(tempSelected);
    if (newSelected.has(photoId)) {
      newSelected.delete(photoId);
    } else {
      newSelected.add(photoId);
    }
    setTempSelected(newSelected);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    setUploadError("");
    addFilesToUpload(Array.from(files));
  };

  const addFilesToUpload = (filesToAdd: File[]) => {
    const newFiles = [...uploadFiles, ...filesToAdd];
    setUploadFiles(newFiles);

    // Create previews for new files
    const newPreviews = [...uploadPreviews];

    filesToAdd.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        newPreviews.push({
          file,
          preview: event.target?.result as string,
        });
        setUploadPreviews([...newPreviews]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeFile = (fileName: string) => {
    setUploadFiles((prev) => prev.filter((f) => f.name !== fileName));
    setUploadPreviews((prev) => prev.filter((p) => p.file.name !== fileName));
  };

  const handleUpload = async () => {
    if (uploadFiles.length === 0) return;

    setIsUploading(true);
    setUploadError("");

    try {
      const uploadedPhotoIds: string[] = [];
      const newPhotos: Array<{
        id: string;
        photoUrl: string;
        user: { name: string; id: string };
        uploadedAt: string;
      }> = [];

      // Upload each file sequentially
      for (let i = 0; i < uploadFiles.length; i++) {
        const file = uploadFiles[i];
        const preview = uploadPreviews[i]?.preview || "";

        try {
          // Update progress
          setUploadProgress((prev) => ({
            ...prev,
            [file.name]: 0,
          }));

          const formData = new FormData();
          formData.append("photoFile", file);
          formData.append("artworkId", artworkId);
          formData.append("isPrivateValue", "false");

          const response = await fetch("/api/artwork/upload", {
            method: "POST",
            body: formData,
          });

          if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || `Failed to upload ${file.name}`);
          }

          const result = await response.json();
          uploadedPhotoIds.push(result.photoId);

          // Add to new photos list
          const newPhoto = {
            id: result.photoId,
            photoUrl: preview,
            user: { name: "You", id: "current-user" },
            uploadedAt: new Date().toISOString(),
          };
          newPhotos.push(newPhoto);

          // Update progress
          setUploadProgress((prev) => ({
            ...prev,
            [file.name]: 100,
          }));
        } catch (error) {
          console.error(`Error uploading ${file.name}:`, error);
          // Continue with next file even if one fails
          setUploadError(
            (prev) =>
              prev + (prev ? "\n" : "") + (error instanceof Error ? error.message : `Failed to upload ${file.name}`)
          );
        }
      }

      if (newPhotos.length > 0) {
        // Add new photos to the list
        const updatedPhotos = [...newPhotos, ...photos];
        setPhotos(updatedPhotos);

        // Auto-select uploaded photos
        setTempSelected((prev) => new Set([...prev, ...uploadedPhotoIds]));

        // Notify parent of new photos
        if (onPhotosUploaded) {
          onPhotosUploaded(newPhotos);
        }

        // Reset upload form
        setUploadFiles([]);
        setUploadPreviews([]);
        setUploadProgress({});
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
        setUploadTab(false);
      }
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setIsUploading(false);
    }
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

        {/* Tabs */}
        <div className="flex border-b" style={{ borderColor: scheme.divider }}>
          <button
            onClick={() => setUploadTab(false)}
            className="flex-1 px-4 py-3 font-medium border-b-2 transition-all"
            style={{
              color: !uploadTab ? scheme.accent : scheme.divider,
              borderColor: !uploadTab ? scheme.accent : "transparent",
            }}
          >
            Browse
          </button>
          <button
            onClick={() => setUploadTab(true)}
            className="flex-1 px-4 py-3 font-medium border-b-2 transition-all"
            style={{
              color: uploadTab ? scheme.accent : scheme.divider,
              borderColor: uploadTab ? scheme.accent : "transparent",
            }}
          >
            Upload
          </button>
        </div>

        {/* Search Bar - Browse Tab */}
        {!uploadTab && (
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
        )}

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6">
          {!uploadTab ? (
            <>
              {/* Browse Tab - Photos Grid */}
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
            </>
          ) : (
            <>
              {/* Upload Tab */}
              <div className="max-w-2xl mx-auto">
                {uploadPreviews.length === 0 ? (
                  <label className="block">
                    <div
                      className="border-2 border-dashed rounded-lg p-12 text-center cursor-pointer hover:opacity-75 transition-all"
                      style={{
                        borderColor: scheme.accent,
                        backgroundColor: scheme.accent + "10",
                      }}
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.currentTarget.style.opacity = "0.5";
                      }}
                      onDragLeave={(e) => {
                        e.currentTarget.style.opacity = "1";
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        const files = Array.from(e.dataTransfer.files).filter((f) =>
                          f.type.startsWith("image/")
                        );
                        if (files.length > 0) {
                          addFilesToUpload(files);
                        }
                      }}
                    >
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleFileSelect}
                        className="hidden"
                      />
                      <div className="text-3xl mb-2">📷</div>
                      <p className="font-medium mb-1" style={{ color: scheme.text }}>
                        Click to upload or drag and drop
                      </p>
                      <p style={{ color: scheme.divider }} className="text-sm">
                        Multiple files accepted • PNG, JPG, HEIC up to 10MB each
                      </p>
                    </div>
                  </label>
                ) : (
                  <div>
                    <div className="mb-4 grid grid-cols-2 sm:grid-cols-3 gap-4">
                      {uploadPreviews.map((item, index) => (
                        <div
                          key={`${item.file.name}-${index}`}
                          className="relative rounded-lg overflow-hidden bg-gray-200 aspect-square group"
                        >
                          <img
                            src={item.preview}
                            alt="Preview"
                            className="w-full h-full object-cover"
                          />

                          {uploadProgress[item.file.name] !== undefined &&
                            uploadProgress[item.file.name] < 100 && (
                              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                <div className="text-white text-center">
                                  <div className="text-sm font-medium mb-2">
                                    {uploadProgress[item.file.name]}%
                                  </div>
                                  <div className="w-16 h-1 bg-black/30 rounded-full overflow-hidden">
                                    <div
                                      className="h-full transition-all"
                                      style={{
                                        width: `${uploadProgress[item.file.name]}%`,
                                        backgroundColor: scheme.accent,
                                      }}
                                    />
                                  </div>
                                </div>
                              </div>
                            )}

                          {uploadProgress[item.file.name] === 100 && (
                            <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                              <div className="text-white text-2xl">✓</div>
                            </div>
                          )}

                          {!isUploading && (
                            <button
                              onClick={() => removeFile(item.file.name)}
                              className="absolute top-2 right-2 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              ×
                            </button>
                          )}
                        </div>
                      ))}
                    </div>

                    <div className="flex gap-2 mb-4">
                      <button
                        onClick={() => {
                          setUploadFiles([]);
                          setUploadPreviews([]);
                          setUploadProgress({});
                          if (fileInputRef.current) {
                            fileInputRef.current.value = "";
                          }
                        }}
                        className="flex-1 px-4 py-2 rounded-lg font-medium transition-all"
                        style={{
                          backgroundColor: scheme.primaryBg,
                          color: scheme.text,
                        }}
                        disabled={isUploading}
                      >
                        Clear All
                      </button>
                      <label className="flex-1">
                        <div
                          className="px-4 py-2 rounded-lg font-medium text-center cursor-pointer transition-all"
                          style={{
                            backgroundColor: scheme.primaryBg,
                            color: scheme.text,
                          }}
                        >
                          Add More
                        </div>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={handleFileSelect}
                          className="hidden"
                        />
                      </label>
                      <button
                        onClick={handleUpload}
                        className="flex-1 px-4 py-2 rounded-lg font-medium text-white transition-all"
                        style={{
                          backgroundColor: scheme.accent,
                        }}
                        disabled={isUploading}
                      >
                        {isUploading
                          ? "Uploading..."
                          : `Upload ${uploadFiles.length} file${uploadFiles.length !== 1 ? "s" : ""}`}
                      </button>
                    </div>
                  </div>
                )}

                {uploadError && (
                  <div className="mt-4 p-3 rounded-lg bg-red-100 text-red-800 text-sm whitespace-pre-wrap">
                    {uploadError}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        {!uploadTab && (
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
              disabled={tempSelected.size === 0}
              className="px-6 py-2 rounded-lg font-medium text-white transition-all disabled:opacity-50"
              style={{
                backgroundColor: scheme.accent,
              }}
            >
              Done ({tempSelected.size} selected)
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
