import { redirect, useRouteLoaderData, Form, useActionData, useNavigation } from "react-router";
import type { Route } from "./+types/artwork.$id.edit-gallery";
import { Header } from "~/components/Header";
import { Button } from "~/components/ui/Button";
import { useTheme } from "~/lib/useTheme";
import { useState, useRef, useEffect } from "react";
import { GalleryPreview } from "~/components/GalleryPreview";
import { PhotoPickerModal } from "~/components/PhotoPickerModal";
import { Toast } from "~/components/ui/Toast";
import { useFetcher } from "react-router";

export const loader: Route.LoaderFunction = async ({ request, params }) => {
  const { getAuthTokenFromCookie, getUserFromToken } = await import("~/lib/auth.server");
  const { getArtwork } = await import("~/lib/artworks.server");
  const { getArtistPhotosForGallery } = await import("~/lib/gallery.server");
  const { prismaClient } = await import("~/lib/db.server");

  const cookieHeader = request.headers.get("cookie");
  const token = getAuthTokenFromCookie(cookieHeader);
  const user = getUserFromToken(token);

  if (!user) {
    return redirect("/auth/login");
  }

  try {
    const artwork = await getArtwork(params.id!);

    if (!artwork) {
      throw new Error("Artwork not found");
    }

    // Check access: only artist who claimed it or admins can edit gallery
    const prisma = await prismaClient();
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { role: true },
    });

    const isArtist = artwork.artistId === user.id;
    const isAdmin = dbUser?.role === "ADMIN";

    if (!isArtist && !isAdmin) {
      return redirect(`/artwork/${artwork.id}`);
    }

    // Verify artwork is claimed before allowing gallery editing
    if (!artwork.artistId) {
      return redirect(`/artwork/${artwork.id}`);
    }

    // Get all photos uploaded by the artist for this artwork
    let artistPhotos: any[] = [];
    try {
      artistPhotos = await getArtistPhotosForGallery(artwork.id, artwork.artistId);
    } catch (photoError) {
      console.error("[GALLERY EDITOR] Error loading photos:", photoError);
      // Continue without photos rather than failing completely
      artistPhotos = [];
    }

    return {
      artwork,
      artistPhotos,
      currentUser: user,
      isArtist,
      isAdmin,
    };
  } catch (error) {
    console.error("[GALLERY EDITOR] Error loading:", error);
    throw error;
  }
};

function json(data: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(data), {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
}

export const action: Route.ActionFunction = async ({ request, params }) => {
  try {
    const { getAuthTokenFromCookie, getUserFromToken } = await import("~/lib/auth.server");
    const { getArtwork } = await import("~/lib/artworks.server");
    const { updateGalleryOrder, toggleGalleryPublished } = await import("~/lib/gallery.server");
    const { prismaClient } = await import("~/lib/db.server");

    const cookieHeader = request.headers.get("cookie");
    const token = getAuthTokenFromCookie(cookieHeader);
    const user = getUserFromToken(token);

    if (!user) {
      return json({ error: "Not authenticated" }, { status: 401 });
    }

    if (request.method === "POST") {
      let formData;
      try {
        formData = await request.formData();
      } catch (formError) {
        console.error("[GALLERY EDITOR] Form data parsing error:", formError);
        return json(
          { error: "Failed to parse form data" },
          { status: 400 }
        );
      }

      const intent = formData.get("_intent");

      try {
        const artwork = await getArtwork(params.id!);
        if (!artwork) {
          return json({ error: "Artwork not found" }, { status: 404 });
        }

        const prisma = await prismaClient();
        const dbUser = await prisma.user.findUnique({
          where: { id: user.id },
          select: { role: true },
        });

        const isArtist = artwork.artistId === user.id;
        const isAdmin = dbUser?.role === "ADMIN";

        if (!isArtist && !isAdmin) {
          return json({ error: "Not authorized" }, { status: 403 });
        }

        if (intent === "update-order") {
          const photoIdsRaw = formData.get("photoIds");
          if (!photoIdsRaw) {
            return json({ error: "No photo IDs provided" }, { status: 400 });
          }

          let photoIds;
          try {
            photoIds = JSON.parse(photoIdsRaw as string);
          } catch (parseError) {
            console.error("[GALLERY EDITOR] JSON parse error:", parseError);
            return json(
              { error: "Invalid photo IDs format" },
              { status: 400 }
            );
          }

          if (!Array.isArray(photoIds)) {
            return json(
              { error: "Photo IDs must be an array" },
              { status: 400 }
            );
          }

          // Update both photo order and published status if provided
          await updateGalleryOrder(artwork.id, photoIds);

          const publishedRaw = formData.get("published");
          if (publishedRaw !== null) {
            const published = publishedRaw === "true";
            await toggleGalleryPublished(artwork.id, published);
          }

          return json({ success: true, message: "Gallery saved successfully!" });
        }

        if (intent === "toggle-publish") {
          const published = formData.get("published") === "true";
          await toggleGalleryPublished(artwork.id, published);
          return json({ success: true, message: published ? "Gallery published" : "Gallery unpublished" });
        }

        return json({ error: "Unknown action" }, { status: 400 });
      } catch (error) {
        console.error("[GALLERY EDITOR] Action error:", error);
        return json(
          { error: error instanceof Error ? error.message : "An error occurred" },
          { status: 500 }
        );
      }
    }

    return json({});
  } catch (error) {
    console.error("[GALLERY EDITOR] Unexpected error:", error);
    return json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
};

export default function GalleryEditorPage() {
  const rootData = useRouteLoaderData("root") as any;
  const loaderData = useRouteLoaderData("routes/artwork.$id.edit-gallery") as any;
  const fetcher = useFetcher<typeof action>();

  const { artwork, artistPhotos: loaderArtistPhotos, isArtist, isAdmin } = loaderData;
  const { scheme } = useTheme();

  const originalGalleryOrder = (artwork.galleryImageOrder as string[]) || [];
  const originalPublished = artwork.galleryPublished || false;
  const [selectedPhotos, setSelectedPhotos] = useState<string[]>(
    originalGalleryOrder
  );
  const [isPublished, setIsPublished] = useState(originalPublished);
  const [isPickerModalOpen, setIsPickerModalOpen] = useState(false);
  const [newlyUploadedPhotos, setNewlyUploadedPhotos] = useState<typeof loaderArtistPhotos>([]);
  const [checkedPhotoIds, setCheckedPhotoIds] = useState<string[]>([]);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const photoIdsRef = useRef<string>(JSON.stringify(selectedPhotos));

  // Check if there are unsaved changes (either photos or publish status changed)
  const hasChanges =
    JSON.stringify(selectedPhotos) !== JSON.stringify(originalGalleryOrder) ||
    isPublished !== originalPublished;

  // Merge loader photos with newly uploaded ones
  const artistPhotos = [...newlyUploadedPhotos, ...loaderArtistPhotos];

  const handleDeletePhotos = async (photoIds: string[]) => {
    if (photoIds.length === 0) return;

    const message = photoIds.length === 1
      ? "Delete this photo?"
      : `Delete ${photoIds.length} photos?`;

    if (!confirm(message)) return;

    try {
      // Delete photos in parallel
      const deletePromises = photoIds.map((photoId) =>
        fetch(`/api/photos/${photoId}`, { method: "DELETE" })
      );

      const responses = await Promise.all(deletePromises);
      const allSuccess = responses.every((res) => res.ok);

      if (allSuccess) {
        // Remove deleted photos from selected and newly uploaded
        setSelectedPhotos((prev) =>
          prev.filter((id) => !photoIds.includes(id))
        );
        setNewlyUploadedPhotos((prev) =>
          prev.filter((photo) => !photoIds.includes(photo.id))
        );
        setCheckedPhotoIds([]);
        setToast({ message: `${photoIds.length} photo${photoIds.length !== 1 ? 's' : ''} deleted`, type: "success" });
      } else {
        setToast({ message: "Failed to delete some photos", type: "error" });
      }
    } catch (error) {
      console.error("Error deleting photos:", error);
      setToast({ message: "Error deleting photos", type: "error" });
    }
  };

  const handleTogglePhotoCheck = (photoId: string) => {
    setCheckedPhotoIds((prev) => {
      if (prev.includes(photoId)) {
        return prev.filter((id) => id !== photoId);
      } else {
        return [...prev, photoId];
      }
    });
  };

  const handleAddPhotosClick = () => {
    setIsPickerModalOpen(true);
  };

  const handleConfirmPhotos = (selectedIds: string[]) => {
    setSelectedPhotos((prev) => {
      const combined = new Set([...prev, ...selectedIds]);
      return Array.from(combined);
    });
    setIsPickerModalOpen(false);
  };

  // Update the ref whenever selectedPhotos changes
  useEffect(() => {
    photoIdsRef.current = JSON.stringify(selectedPhotos);
  }, [selectedPhotos]);

  // Show toast when fetcher data updates
  useEffect(() => {
    if (fetcher.data?.success) {
      setToast({ message: fetcher.data.message || "Gallery saved successfully!", type: "success" });
    } else if (fetcher.data?.error) {
      setToast({ message: fetcher.data.error, type: "error" });
    }
  }, [fetcher.data]);

  const handleSave = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!formRef.current) return;

    const formData = new FormData(formRef.current);
    formData.set("photoIds", photoIdsRef.current);
    formData.set("published", isPublished.toString());

    // Use React Router's fetcher to submit the form
    fetcher.submit(formData, {
      method: "POST",
      action: formRef.current.action,
    });
  };

  // Get preview photos with full data
  const previewPhotos = selectedPhotos
    .map((photoId) => artistPhotos.find((p) => p.id === photoId))
    .filter(Boolean);

  return (
    <div
      className="min-h-screen relative"
      suppressHydrationWarning
      style={{ backgroundColor: scheme.primaryBg }}
    >
      <Header user={rootData?.user} />

      <main className="max-w-6xl mx-auto px-4 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2" style={{ color: scheme.text }}>
            Manage Official Gallery
          </h1>
          <p style={{ color: scheme.divider }}>
            {artwork.title}
          </p>
          <p className="text-sm mt-2" style={{ color: scheme.divider }}>
            Drag photos to reorder, check boxes to select for bulk delete, or click + to add photos.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Gallery Editor */}
          <div className="lg:col-span-2">
            {selectedPhotos.length === 0 ? (
              <div
                className="rounded-lg p-12 text-center"
                style={{ backgroundColor: scheme.secondaryBg }}
              >
                <p className="text-lg mb-4" style={{ color: scheme.divider }}>
                  No photos in your gallery yet
                </p>
                <Button
                  variant="primary"
                  onClick={handleAddPhotosClick}
                  className="inline-flex"
                >
                  + Add Photos
                </Button>
              </div>
            ) : (
              <div
                className="rounded-lg p-6"
                style={{ backgroundColor: scheme.secondaryBg }}
              >
                <GalleryPreview
                  photos={previewPhotos as any[]}
                  onAddPhotosClick={handleAddPhotosClick}
                  onReorder={(photoIds) => setSelectedPhotos(photoIds)}
                  onDeletePhotos={handleDeletePhotos}
                  isDraggable={true}
                  checkedPhotoIds={checkedPhotoIds}
                  onTogglePhotoCheck={handleTogglePhotoCheck}
                />
              </div>
            )}
          </div>

          {/* Right: Gallery Settings & Controls */}
          <div>
            <div
              className="rounded-lg p-6 sticky top-4"
              style={{ backgroundColor: scheme.secondaryBg }}
            >
              <h2 className="text-xl font-bold mb-6" style={{ color: scheme.text }}>
                Gallery Settings
              </h2>

              {/* Status Info */}
              <div className="mb-6 p-4 rounded-lg" style={{ backgroundColor: scheme.primaryBg }}>
                <p className="text-sm font-medium mb-2" style={{ color: scheme.text }}>
                  Selected Photos
                </p>
                <p className="text-2xl font-bold" style={{ color: scheme.accent }}>
                  {selectedPhotos.length}
                </p>
                <p className="text-xs mt-1" style={{ color: scheme.divider }}>
                  {selectedPhotos.length === 0
                    ? "Select photos to build your gallery"
                    : selectedPhotos.length === 1
                    ? "Add more photos for a better gallery"
                    : "Ready to save and publish"}
                </p>
              </div>

              {/* Bulk Delete Section */}
              {checkedPhotoIds.length > 0 && (
                <div className="mb-6 p-4 rounded-lg bg-red-50 border border-red-200">
                  <p className="text-sm font-medium text-red-900 mb-3">
                    {checkedPhotoIds.length} photo{checkedPhotoIds.length !== 1 ? 's' : ''} selected
                  </p>
                  <button
                    onClick={() => handleDeletePhotos(checkedPhotoIds)}
                    className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors"
                  >
                    🗑️ Delete Selected
                  </button>
                </div>
              )}

              {/* Publish Toggle */}
              <div className="mb-6">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={isPublished}
                    onChange={(e) => setIsPublished(e.target.checked)}
                    className="w-5 h-5 cursor-pointer"
                  />
                  <div className="flex-1">
                    <p style={{ color: scheme.text }} className="text-sm font-medium">
                      Publish Gallery
                    </p>
                    <p className="text-xs" style={{ color: scheme.divider }}>
                      {isPublished ? "Visible on your artwork page" : "Gallery is private"}
                    </p>
                  </div>
                </label>
              </div>

              {/* Save Button */}
              <form
                ref={formRef}
                action={`/artwork/${artwork.id}/edit-gallery`}
                method="POST"
                onSubmit={handleSave}
                className="mb-3"
              >
                <input type="hidden" name="_intent" value="update-order" />
                <Button
                  type="submit"
                  variant="primary"
                  className="w-full"
                  disabled={fetcher.state !== "idle" || !hasChanges}
                  title={!hasChanges ? "No changes to save" : ""}
                >
                  {fetcher.state !== "idle" ? "Saving..." : "💾 Save Gallery"}
                </Button>
              </form>

              {/* Back Link */}
              <a
                href={`/artwork/${artwork.id}`}
                className="block text-center text-sm font-medium py-2"
                style={{ color: scheme.accent }}
              >
                ← Back to Artwork
              </a>
            </div>
          </div>
        </div>
      </main>

      {/* Photo Picker Modal */}
      {isPickerModalOpen && (
        <PhotoPickerModal
          allPhotos={artistPhotos}
          selectedPhotoIds={selectedPhotos}
          onClose={() => setIsPickerModalOpen(false)}
          onConfirm={handleConfirmPhotos}
          artworkId={artwork.id}
          onPhotosUploaded={(newPhotos) => {
            // Add newly uploaded photos to the list so they can be selected
            setNewlyUploadedPhotos((prev) => [...newPhotos, ...prev]);
          }}
        />
      )}

      {/* Toast Notification */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
