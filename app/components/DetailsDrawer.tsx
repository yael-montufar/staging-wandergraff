import { useState, useEffect, useMemo, useRef } from "react";
import { useTheme } from "~/lib/useTheme";
import { Button } from "./ui/Button";
import { convertMobileImage } from "~/lib/image-conversion.client";
import type { UseFetcher } from "react-router";

interface DetailsDrawerProps {
  artwork: any;
  allPhotos: Array<{
    id: string;
    photoUrl: string;
    user: { name: string; id: string };
    uploadedAt: string;
  }>;
  currentUser: any;
  onClose: () => void;
  fetcher: UseFetcher<any>;
  isEditing: boolean;
  editTitle: string;
  editYear: string;
  editDescription: string;
  editAddress: string;
  onEditChange: (field: string, value: string) => void;
  onEditStart: () => void;
  onEditCancel: () => void;
  saveSuccess: boolean;
  communityPhotos: any[];
  onLoadMoreCommunity: () => void;
  communityLoading: boolean;
  communityPhotoCount: number;
}

type DrawerLayer = "details" | "photos";

export function DetailsDrawer({
  artwork,
  allPhotos,
  currentUser,
  onClose,
  fetcher,
  isEditing,
  editTitle,
  editYear,
  editDescription,
  editAddress,
  onEditChange,
  onEditStart,
  onEditCancel,
  saveSuccess,
  communityPhotos,
  onLoadMoreCommunity,
  communityLoading,
  communityPhotoCount,
}: DetailsDrawerProps) {
  const { scheme } = useTheme();
  const [isOpen, setIsOpen] = useState(true);
  const [currentLayer, setCurrentLayer] = useState<DrawerLayer>("details");
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth < 768;
  });

  // Photo layer state
  const [searchQuery, setSearchQuery] = useState("");
  const [tempSelected, setTempSelected] = useState<Set<string>>(new Set());
  const [photos, setPhotos] = useState(allPhotos);
  const [uploadTab, setUploadTab] = useState(false);
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [uploadPreviews, setUploadPreviews] = useState<{ file: File; preview: string }[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleClose = () => {
    setIsOpen(false);
    setTimeout(() => {
      onClose();
    }, 300);
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  const handleGoToPhotos = () => {
    setCurrentLayer("photos");
  };

  const handleBackToDetails = () => {
    setCurrentLayer("details");
  };

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
    const MAX_FILE_SIZE = 50 * 1024 * 1024;
    const validFiles: File[] = [];
    const errors: string[] = [];

    filesToAdd.forEach((file) => {
      if (file.size > MAX_FILE_SIZE) {
        errors.push(`${file.name} is too large (${(file.size / 1024 / 1024).toFixed(1)}MB, max 50MB - will be compressed)`);
      } else if (!file.type.startsWith("image/")) {
        errors.push(`${file.name} is not an image file`);
      } else {
        validFiles.push(file);
      }
    });

    if (errors.length > 0) {
      setUploadError(errors.join("\n"));
    }

    if (validFiles.length === 0) return;

    const newFiles = [...uploadFiles, ...validFiles];
    setUploadFiles(newFiles);

    const newPreviews = [...uploadPreviews];
    validFiles.forEach((file) => {
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
      const errors: string[] = [];

      for (let i = 0; i < uploadFiles.length; i++) {
        let file = uploadFiles[i];
        const preview = uploadPreviews[i]?.preview || "";

        try {
          setUploadProgress((prev) => ({
            ...prev,
            [file.name]: 10,
          }));

          try {
            file = await convertMobileImage(file, {
              maxWidth: 2048,
              maxHeight: 2048,
              quality: 0.75,
            });
          } catch (compressionError) {
            console.error(`[UPLOAD] Compression failed, will try original file:`, compressionError);
          }

          const formData = new FormData();
          formData.append("photoFile", file);
          formData.append("artworkId", artwork.id);
          formData.append("isPrivateValue", "false");

          const response = await fetch("/api/artwork/upload", {
            method: "POST",
            body: formData,
          });

          if (!response.ok) {
            const contentType = response.headers.get("content-type");
            let errorMessage = `Failed to upload ${file.name} (${response.status} ${response.statusText})`;

            if (response.status === 413) {
              errorMessage = `File too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Server limit is ~4.5MB. Try a smaller or lower quality image.`;
            }

            if (contentType?.includes("application/json")) {
              try {
                const error = await response.json();
                errorMessage = error.error || errorMessage;
              } catch (parseError) {
                console.error("[UPLOAD] Failed to parse JSON error response:", parseError);
              }
            }

            throw new Error(errorMessage);
          }

          const contentType = response.headers.get("content-type");
          if (!contentType?.includes("application/json")) {
            throw new Error(`Server returned invalid response format (${contentType})`);
          }

          let result;
          try {
            result = await response.json();
          } catch (parseError) {
            console.error("[UPLOAD] Failed to parse JSON response:", parseError);
            throw new Error("Failed to parse server response - file may be too large or server error");
          }

          uploadedPhotoIds.push(result.photoId);

          const newPhoto = {
            id: result.photoId,
            photoUrl: preview,
            user: { name: "You", id: "current-user" },
            uploadedAt: new Date().toISOString(),
          };
          newPhotos.push(newPhoto);

          setUploadProgress((prev) => ({
            ...prev,
            [file.name]: 100,
          }));
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : `Failed to upload ${file.name}`;
          console.error(`[UPLOAD] Error uploading ${file.name}:`, error);
          errors.push(errorMsg);
        }
      }

      if (errors.length > 0) {
        setUploadError(errors.join("\n"));
      }

      if (newPhotos.length > 0) {
        const updatedPhotos = [...newPhotos, ...photos];
        setPhotos(updatedPhotos);
        setTempSelected((prev) => new Set([...prev, ...uploadedPhotoIds]));
        setUploadFiles([]);
        setUploadPreviews([]);
        setUploadProgress({});
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
        setUploadTab(false);
      }
    } catch (error) {
      console.error("[UPLOAD] Upload batch error:", error);
      setUploadError(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setIsUploading(false);
    }
  };

  const displayStatus =
    currentUser?.id === artwork.artistId && artwork.claimStatus === "PENDING_APPROVAL"
      ? artwork.claimStatus
      : artwork.claimStatus === "PENDING_APPROVAL"
        ? "UNCLAIMED"
        : artwork.claimStatus;

  const statusLabel = {
    UNCLAIMED: "Unclaimed",
    PENDING_APPROVAL: "Pending Approval",
    CLAIMED: "Claimed by Artist",
  }[displayStatus || "UNCLAIMED"];

  const statusColor = {
    UNCLAIMED: "bg-gray-100 text-gray-800",
    PENDING_APPROVAL: "bg-yellow-100 text-yellow-800",
    CLAIMED: "bg-green-100 text-green-800",
  }[displayStatus || "UNCLAIMED"];

  return (
    <>
      {/* Dark Overlay */}
      <div
        className={`fixed inset-0 z-40 transition-opacity duration-300 ${
          isOpen ? "opacity-100 bg-black/50" : "opacity-0 pointer-events-none bg-black/0"
        }`}
        onClick={handleBackdropClick}
      />

      {/* Drawer Container - Right on Desktop, Bottom on Mobile */}
      <div
        className={`fixed z-50 shadow-xl flex flex-col
          transition-all duration-300 ease-in-out
          bottom-0 left-0 right-0 md:right-0 md:bottom-0 md:left-auto md:top-0
          max-h-[90vh] md:max-h-screen md:w-96 lg:w-[28rem]
          rounded-t-2xl md:rounded-none
        `}
        style={{
          backgroundColor: scheme.secondaryBg,
          transform: isOpen
            ? "translateX(0) translateY(0)"
            : isMobile
              ? "translateY(100%)"
              : "translateX(100%)",
        }}
      >
        {/* Handle bar for mobile */}
        <div className="md:hidden flex justify-center py-2 px-4">
          <div
            className="w-12 h-1 rounded-full"
            style={{ backgroundColor: scheme.divider }}
          />
        </div>

        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4 border-b md:px-6 md:py-6"
          style={{ borderColor: scheme.divider }}
        >
          <h2 className="text-xl font-bold" style={{ color: scheme.text }}>
            {currentLayer === "details" ? "Artwork Details" : "Select Photos"}
          </h2>
          <div className="flex items-center gap-2">
            {currentLayer === "photos" && (
              <button
                onClick={handleBackToDetails}
                className="text-sm font-medium px-3 py-1 rounded transition-all hover:opacity-70"
                style={{
                  color: scheme.accent,
                  borderBottom: `2px solid ${scheme.accent}`,
                }}
                title="Back to details"
              >
                ← Back
              </button>
            )}
            <button
              onClick={handleClose}
              className="text-2xl font-light hover:opacity-70 transition-opacity"
              style={{ color: scheme.divider }}
            >
              ×
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          {currentLayer === "details" ? (
            /* Details Layer */
            <div className="space-y-8">
              {/* Title and Status */}
              <div>
                <div className="flex items-start justify-between mb-4">
                  <h1
                    className="text-2xl md:text-3xl font-bold flex-1"
                    suppressHydrationWarning
                    style={{ color: scheme.text }}
                  >
                    {artwork.title}
                  </h1>
                  {artwork.claimStatus === "CLAIMED" && artwork.artistId === currentUser?.id && !isEditing && (
                    <button
                      onClick={onEditStart}
                      className="ml-4 text-sm font-medium px-3 py-1 transition-colors hover:opacity-80"
                      suppressHydrationWarning
                      style={{
                        color: scheme.accent,
                        borderBottom: `2px solid ${scheme.accent}`,
                      }}
                    >
                      Edit
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className="text-xs font-semibold px-3 py-1 uppercase tracking-wide"
                    suppressHydrationWarning
                    style={{
                      color: scheme.accent,
                      borderColor: scheme.accent,
                      border: `1px solid ${scheme.accent}`,
                    }}
                  >
                    {statusLabel}
                  </span>
                </div>
              </div>

              {/* Artist Info */}
              {artwork.artist && (
                <div
                  className="border-t pt-6"
                  suppressHydrationWarning
                  style={{ borderColor: scheme.divider }}
                >
                  <p
                    className="text-xs font-semibold mb-2 uppercase tracking-widest"
                    suppressHydrationWarning
                    style={{ color: scheme.divider }}
                  >
                    Artist
                  </p>
                  <p
                    className="text-lg font-semibold"
                    suppressHydrationWarning
                    style={{ color: scheme.text }}
                  >
                    {artwork.artist.name || artwork.artist.email}
                  </p>
                </div>
              )}

              {/* Year Created */}
              {artwork.yearCreated ? (
                <div
                  className="border-t pt-6"
                  suppressHydrationWarning
                  style={{ borderColor: scheme.divider }}
                >
                  <p
                    className="text-xs font-semibold mb-2 uppercase tracking-widest"
                    suppressHydrationWarning
                    style={{ color: scheme.divider }}
                  >
                    Year Created
                  </p>
                  <p
                    className="text-lg font-semibold"
                    suppressHydrationWarning
                    style={{ color: scheme.text }}
                  >
                    {artwork.yearCreated}
                  </p>
                </div>
              ) : null}

              {/* Location */}
              <div
                className="border-t pt-6"
                suppressHydrationWarning
                style={{ borderColor: scheme.divider }}
              >
                <p
                  className="text-xs font-semibold mb-2 uppercase tracking-widest"
                  suppressHydrationWarning
                  style={{ color: scheme.divider }}
                >
                  Location
                </p>
                <p
                  className="text-sm font-mono mb-2"
                  suppressHydrationWarning
                  style={{ color: scheme.text }}
                >
                  {artwork.latitude.toFixed(6)}, {artwork.longitude.toFixed(6)}
                </p>
                {artwork.address && (
                  <p
                    className="text-sm"
                    suppressHydrationWarning
                    style={{ color: scheme.text }}
                  >
                    {artwork.address}
                  </p>
                )}
              </div>

              {/* Photos Info */}
              <div
                className="border-t pt-6"
                suppressHydrationWarning
                style={{ borderColor: scheme.divider }}
              >
                <p
                  className="text-xs font-semibold mb-3 uppercase tracking-widest"
                  suppressHydrationWarning
                  style={{ color: scheme.divider }}
                >
                  Photos
                </p>
                <div className="space-y-1 text-sm">
                  {communityPhotos.length > 0 && (
                    <p suppressHydrationWarning style={{ color: scheme.text }}>
                      <span className="font-semibold">{communityPhotos.length}</span> community{" "}
                      {communityPhotos.length === 1 ? "photo" : "photos"}
                    </p>
                  )}
                  {allPhotos.length === 0 && (
                    <p suppressHydrationWarning style={{ color: scheme.divider }}>
                      No photos yet
                    </p>
                  )}
                </div>
              </div>

              {/* Description */}
              {artwork.description && (
                <div
                  className="border-t pt-6"
                  suppressHydrationWarning
                  style={{ borderColor: scheme.divider }}
                >
                  <p
                    className="text-xs font-semibold mb-2 uppercase tracking-widest"
                    suppressHydrationWarning
                    style={{ color: scheme.divider }}
                  >
                    Description
                  </p>
                  <p
                    className="text-sm leading-relaxed"
                    suppressHydrationWarning
                    style={{ color: scheme.text }}
                  >
                    {artwork.description}
                  </p>
                </div>
              )}

              {/* Edit Form */}
              {isEditing && artwork.claimStatus === "CLAIMED" && artwork.artistId === currentUser?.id && (
                <div
                  className="border-t pt-8"
                  suppressHydrationWarning
                  style={{ borderColor: scheme.divider }}
                >
                  <h3
                    className="text-lg font-semibold mb-6 uppercase tracking-wide"
                    suppressHydrationWarning
                    style={{ color: scheme.text }}
                  >
                    Edit Details
                  </h3>
                  <fetcher.Form method="post" className="space-y-6">
                    <input type="hidden" name="intent" value="update-metadata" />

                    <div>
                      <label
                        className="block text-xs font-semibold mb-2 uppercase tracking-widest"
                        suppressHydrationWarning
                        style={{ color: scheme.divider }}
                      >
                        Title *
                      </label>
                      <input
                        type="text"
                        name="title"
                        value={editTitle}
                        onChange={(e) => onEditChange("title", e.target.value)}
                        placeholder="Artwork title"
                        className="w-full px-3 py-2 border transition-colors focus:outline-none text-sm"
                        suppressHydrationWarning
                        style={{
                          borderColor: scheme.divider,
                          color: scheme.text,
                          backgroundColor: scheme.primaryBg,
                        }}
                        onFocus={(e) => {
                          e.currentTarget.style.borderColor = scheme.accent;
                        }}
                        onBlur={(e) => {
                          e.currentTarget.style.borderColor = scheme.divider;
                        }}
                      />
                    </div>

                    <div>
                      <label
                        className="block text-xs font-semibold mb-2 uppercase tracking-widest"
                        suppressHydrationWarning
                        style={{ color: scheme.divider }}
                      >
                        Year Created
                      </label>
                      <input
                        type="number"
                        name="year"
                        value={editYear}
                        onChange={(e) => onEditChange("year", e.target.value)}
                        placeholder="e.g., 2023"
                        min="1900"
                        max={new Date().getFullYear()}
                        className="w-full px-3 py-2 border transition-colors focus:outline-none text-sm"
                        suppressHydrationWarning
                        style={{
                          borderColor: scheme.divider,
                          color: scheme.text,
                          backgroundColor: scheme.primaryBg,
                        }}
                        onFocus={(e) => {
                          e.currentTarget.style.borderColor = scheme.accent;
                        }}
                        onBlur={(e) => {
                          e.currentTarget.style.borderColor = scheme.divider;
                        }}
                      />
                    </div>

                    <div>
                      <label
                        className="block text-xs font-semibold mb-2 uppercase tracking-widest"
                        suppressHydrationWarning
                        style={{ color: scheme.divider }}
                      >
                        Address
                      </label>
                      <input
                        type="text"
                        name="address"
                        value={editAddress}
                        onChange={(e) => onEditChange("address", e.target.value)}
                        placeholder="e.g., 120 West 1st Street, Los Angeles, CA"
                        className="w-full px-3 py-2 border text-sm transition-colors focus:outline-none"
                        suppressHydrationWarning
                        style={{
                          borderColor: scheme.divider,
                          color: scheme.text,
                          backgroundColor: scheme.primaryBg,
                        }}
                        onFocus={(e) => {
                          e.currentTarget.style.borderColor = scheme.accent;
                        }}
                        onBlur={(e) => {
                          e.currentTarget.style.borderColor = scheme.divider;
                        }}
                      />
                      <p
                        className="text-xs mt-2"
                        suppressHydrationWarning
                        style={{ color: scheme.divider }}
                      >
                        Changing the address will update the location coordinates
                      </p>
                    </div>

                    <div>
                      <label
                        className="block text-xs font-semibold mb-2 uppercase tracking-widest"
                        suppressHydrationWarning
                        style={{ color: scheme.divider }}
                      >
                        Description
                      </label>
                      <textarea
                        name="description"
                        value={editDescription}
                        onChange={(e) => onEditChange("description", e.target.value)}
                        placeholder="Add a description..."
                        rows={4}
                        className="w-full px-3 py-2 border transition-colors focus:outline-none resize-none text-sm"
                        suppressHydrationWarning
                        style={{
                          borderColor: scheme.divider,
                          color: scheme.text,
                          backgroundColor: scheme.primaryBg,
                        }}
                        onFocus={(e) => {
                          e.currentTarget.style.borderColor = scheme.accent;
                        }}
                        onBlur={(e) => {
                          e.currentTarget.style.borderColor = scheme.divider;
                        }}
                      />
                    </div>

                    <div className="flex gap-4 pt-4">
                      <button
                        type="submit"
                        disabled={fetcher.state !== "idle"}
                        className="flex-1 px-4 py-2 text-sm font-medium transition-colors rounded"
                        suppressHydrationWarning
                        style={{
                          color: "white",
                          backgroundColor: scheme.accent,
                          opacity: fetcher.state !== "idle" ? 0.6 : 1,
                          cursor: fetcher.state !== "idle" ? "not-allowed" : "pointer",
                        }}
                      >
                        {fetcher.state !== "idle" ? "Saving..." : "Save Changes"}
                      </button>
                      <button
                        type="button"
                        onClick={onEditCancel}
                        className="flex-1 px-4 py-2 border text-sm font-medium transition-colors hover:opacity-80 rounded"
                        suppressHydrationWarning
                        style={{
                          borderColor: scheme.divider,
                          color: scheme.text,
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </fetcher.Form>
                </div>
              )}

              {/* Actions */}
              <div
                className="border-t pt-8 space-y-3"
                suppressHydrationWarning
                style={{ borderColor: scheme.divider }}
              >
                {/* Add Photo Button */}
                <button
                  onClick={handleGoToPhotos}
                  className="w-full px-4 py-2 text-sm font-medium border rounded transition"
                  suppressHydrationWarning
                  style={{
                    color: scheme.text,
                    backgroundColor: scheme.primaryBg,
                    borderColor: scheme.accent,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.opacity = "0.8";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.opacity = "1";
                  }}
                >
                  📸 Add Your Photo
                </button>

                {/* Save Success Message */}
                {saveSuccess && (
                  <div
                    className="p-4 border text-sm rounded"
                    suppressHydrationWarning
                    style={{
                      borderColor: scheme.accent,
                      backgroundColor: scheme.primaryBg,
                      color: scheme.accent,
                    }}
                  >
                    ✓ Artwork updated successfully
                  </div>
                )}

                {/* Error Messages */}
                {fetcher.data?.error && (
                  <div
                    className="p-4 border text-sm rounded"
                    suppressHydrationWarning
                    style={{
                      borderColor: scheme.accent,
                      backgroundColor: scheme.primaryBg,
                      color: scheme.accent,
                    }}
                  >
                    {fetcher.data.error}
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Photos Layer */
            <div className="space-y-4">
              {/* Tabs */}
              <div className="flex border-b -mx-4 px-4" style={{ borderColor: scheme.divider }}>
                <button
                  onClick={() => setUploadTab(false)}
                  className="flex-1 px-4 py-3 font-medium border-b-2 transition-all text-sm"
                  style={{
                    color: !uploadTab ? scheme.accent : scheme.divider,
                    borderColor: !uploadTab ? scheme.accent : "transparent",
                  }}
                >
                  Browse
                </button>
                <button
                  onClick={() => setUploadTab(true)}
                  className="flex-1 px-4 py-3 font-medium border-b-2 transition-all text-sm"
                  style={{
                    color: uploadTab ? scheme.accent : scheme.divider,
                    borderColor: uploadTab ? scheme.accent : "transparent",
                  }}
                >
                  Upload
                </button>
              </div>

              {!uploadTab ? (
                <>
                  {/* Browse Tab */}
                  <input
                    type="text"
                    placeholder="Search photos"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg border text-sm"
                    style={{
                      backgroundColor: scheme.primaryBg,
                      borderColor: scheme.divider,
                      color: scheme.text,
                    }}
                  />

                  <div className="grid grid-cols-3 gap-3">
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
                    <div className="flex items-center justify-center h-40">
                      <p style={{ color: scheme.divider }}>No photos found</p>
                    </div>
                  )}

                  {filteredPhotos.length > 0 && (
                    <div className="flex gap-2 pt-4 -mx-4 px-4 -mb-4 pb-4 border-t" style={{ borderColor: scheme.divider }}>
                      <button
                        onClick={handleBackToDetails}
                        className="flex-1 px-4 py-2 rounded-lg font-medium transition-all text-sm"
                        style={{
                          backgroundColor: scheme.primaryBg,
                          color: scheme.text,
                        }}
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleBackToDetails}
                        disabled={tempSelected.size === 0}
                        className="flex-1 px-4 py-2 rounded-lg font-medium text-white transition-all disabled:opacity-50 text-sm"
                        style={{
                          backgroundColor: scheme.accent,
                        }}
                      >
                        Done ({tempSelected.size})
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <>
                  {/* Upload Tab */}
                  {uploadPreviews.length === 0 ? (
                    <label className="block">
                      <div
                        className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:opacity-75 transition-all"
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
                        <p className="font-medium mb-1 text-sm" style={{ color: scheme.text }}>
                          Click to upload or drag and drop
                        </p>
                        <p style={{ color: scheme.divider }} className="text-xs">
                          Multiple files accepted • PNG, JPG, HEIC
                        </p>
                      </div>
                    </label>
                  ) : (
                    <div>
                      <div className="mb-4 grid grid-cols-2 gap-3">
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
                                      {uploadProgress[item.file.name] < 20
                                        ? "Compressing..."
                                        : `${uploadProgress[item.file.name]}%`}
                                    </div>
                                    <div className="w-12 h-1 bg-black/30 rounded-full overflow-hidden">
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
                                className="absolute top-2 right-2 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-sm"
                              >
                                ×
                              </button>
                            )}
                          </div>
                        ))}
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setUploadFiles([]);
                            setUploadPreviews([]);
                            setUploadProgress({});
                            if (fileInputRef.current) {
                              fileInputRef.current.value = "";
                            }
                          }}
                          className="flex-1 px-4 py-2 rounded-lg font-medium transition-all text-sm"
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
                            className="px-4 py-2 rounded-lg font-medium text-center cursor-pointer transition-all text-sm"
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
                          className="flex-1 px-4 py-2 rounded-lg font-medium text-white transition-all text-sm"
                          style={{
                            backgroundColor: scheme.accent,
                          }}
                          disabled={isUploading}
                        >
                          {isUploading ? "Uploading..." : `Upload ${uploadFiles.length}`}
                        </button>
                      </div>
                    </div>
                  )}

                  {uploadError && (
                    <div className="mt-4 p-3 rounded-lg bg-red-100 text-red-800 text-sm whitespace-pre-wrap">
                      {uploadError}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
