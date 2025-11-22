import { redirect, useRouteLoaderData, Form, useActionData, useNavigation } from "react-router";
import type { Route } from "./+types/artwork.$id.edit-gallery";
import { Header } from "~/components/Header";
import { Button } from "~/components/ui/Button";
import { useTheme } from "~/lib/useTheme";
import { useState, useRef } from "react";
import { GalleryPreview } from "~/components/GalleryPreview";
import { PhotoPickerModal } from "~/components/PhotoPickerModal";

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

export const action: Route.ActionFunction = async ({ request, params }) => {
  const { getAuthTokenFromCookie, getUserFromToken } = await import("~/lib/auth.server");
  const { getArtwork } = await import("~/lib/artworks.server");
  const { updateGalleryOrder, toggleGalleryPublished } = await import("~/lib/gallery.server");
  const { prismaClient } = await import("~/lib/db.server");

  const cookieHeader = request.headers.get("cookie");
  const token = getAuthTokenFromCookie(cookieHeader);
  const user = getUserFromToken(token);

  if (!user) {
    return { error: "Not authenticated" };
  }

  if (request.method === "POST") {
    const formData = await request.formData();
    const intent = formData.get("_intent");

    try {
      const artwork = await getArtwork(params.id!);
      if (!artwork) {
        return { error: "Artwork not found" };
      }

      const prisma = await prismaClient();
      const dbUser = await prisma.user.findUnique({
        where: { id: user.id },
        select: { role: true },
      });

      const isArtist = artwork.artistId === user.id;
      const isAdmin = dbUser?.role === "ADMIN";

      if (!isArtist && !isAdmin) {
        return { error: "Not authorized" };
      }

      if (intent === "update-order") {
        const photoIds = JSON.parse(formData.get("photoIds") as string);
        await updateGalleryOrder(artwork.id, photoIds);
        return { success: true, message: "Gallery order updated" };
      }

      if (intent === "toggle-publish") {
        const published = formData.get("published") === "true";
        await toggleGalleryPublished(artwork.id, published);
        return { success: true, message: published ? "Gallery published" : "Gallery unpublished" };
      }

      return { error: "Unknown action" };
    } catch (error) {
      console.error("[GALLERY EDITOR] Error:", error);
      return {
        error: error instanceof Error ? error.message : "An error occurred",
      };
    }
  }

  return {};
};

export default function GalleryEditorPage() {
  const rootData = useRouteLoaderData("root") as any;
  const loaderData = useRouteLoaderData("routes/artwork.$id.edit-gallery") as any;
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();

  const { artwork, artistPhotos, isArtist, isAdmin } = loaderData;
  const { scheme } = useTheme();

  const [selectedPhotos, setSelectedPhotos] = useState<string[]>(
    (artwork.galleryImageOrder as string[]) || []
  );
  const [isPublished, setIsPublished] = useState(artwork.galleryPublished || false);
  const [draggedItem, setDraggedItem] = useState<string | null>(null);
  const [isPickerModalOpen, setIsPickerModalOpen] = useState(false);
  const dragOverIndexRef = useRef<number | null>(null);

  const handleTogglePhoto = (photoId: string) => {
    setSelectedPhotos((prev) => {
      if (prev.includes(photoId)) {
        return prev.filter((id) => id !== photoId);
      } else {
        return [...prev, photoId];
      }
    });
  };

  const handleDeletePhoto = async (photoId: string) => {
    if (!confirm("Delete this photo?")) return;

    try {
      const response = await fetch(`/api/photos/${photoId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        // Remove from selected photos if it was selected
        setSelectedPhotos((prev) => prev.filter((id) => id !== photoId));
        // Reload page to refresh artist photos list
        window.location.reload();
      } else {
        alert("Failed to delete photo");
      }
    } catch (error) {
      console.error("Error deleting photo:", error);
      alert("Error deleting photo");
    }
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

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, photoId: string) => {
    setDraggedItem(photoId);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    dragOverIndexRef.current = index;
  };

  const handleDragLeave = () => {
    dragOverIndexRef.current = null;
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, dropIndex: number) => {
    e.preventDefault();

    if (!draggedItem) return;

    const draggedIndex = selectedPhotos.indexOf(draggedItem);
    if (draggedIndex === -1 || draggedIndex === dropIndex) {
      setDraggedItem(null);
      dragOverIndexRef.current = null;
      return;
    }

    const newOrder = [...selectedPhotos];
    newOrder.splice(draggedIndex, 1);
    newOrder.splice(dropIndex, 0, draggedItem);
    setSelectedPhotos(newOrder);

    setDraggedItem(null);
    dragOverIndexRef.current = null;
  };

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget as HTMLFormElement;
    const formData = new FormData(form);
    formData.set("photoIds", JSON.stringify(selectedPhotos));

    const event = new Event("submit", { bubbles: true });
    Object.defineProperty(event, "target", { value: form });
    form.dispatchEvent(event);
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
            Drag photos below to reorder, select which ones to display, and see a live preview of your gallery.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left: Photo Selection & Reordering */}
          <div className="lg:col-span-2">
            <div className="space-y-8">
              {/* Photo Selection */}
              <div>
                <h2 className="text-xl font-bold mb-4" style={{ color: scheme.text }}>
                  Your Photos ({artistPhotos.length})
                </h2>

                <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                  {artistPhotos.map((photo) => (
                    <div
                      key={photo.id}
                      className="relative rounded-lg overflow-hidden bg-gray-200 aspect-square hover:shadow-lg transition-all group"
                      style={{
                        opacity: selectedPhotos.includes(photo.id) ? 1 : 0.6,
                        border: selectedPhotos.includes(photo.id)
                          ? `3px solid ${scheme.accent}`
                          : "3px solid transparent",
                      }}
                    >
                      <img
                        src={photo.photoUrl}
                        alt="Photo"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/40 group-hover:bg-black/50 transition-colors flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 gap-2">
                        <button
                          onClick={() => handleTogglePhoto(photo.id)}
                          className="flex items-center justify-center w-10 h-10 rounded-full bg-white/90 hover:bg-white transition-colors"
                          title={selectedPhotos.includes(photo.id) ? "Remove" : "Add"}
                        >
                          <span className="text-gray-800 font-bold text-lg">
                            {selectedPhotos.includes(photo.id) ? "✓" : "+"}
                          </span>
                        </button>
                        <button
                          onClick={() => handleDeletePhoto(photo.id)}
                          className="flex items-center justify-center w-10 h-10 rounded-full bg-red-500/90 hover:bg-red-600 transition-colors"
                          title="Delete photo"
                        >
                          <span className="text-white font-bold text-lg">×</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Gallery Preview */}
              {selectedPhotos.length > 0 && (
                <div>
                  <h2 className="text-xl font-bold mb-4" style={{ color: scheme.text }}>
                    Gallery Preview
                  </h2>
                  <div
                    className="rounded-lg p-6"
                    style={{ backgroundColor: scheme.secondaryBg }}
                  >
                    <GalleryPreview
                      photos={previewPhotos as any[]}
                      onAddPhotosClick={handleAddPhotosClick}
                    />
                  </div>
                </div>
              )}

              {/* Drag & Drop Reordering */}
              {selectedPhotos.length > 0 && (
                <div>
                  <h2 className="text-xl font-bold mb-4" style={{ color: scheme.text }}>
                    Reorder Photos (Drag to move)
                  </h2>
                  <div className="space-y-2">
                    {selectedPhotos.map((photoId, index) => {
                      const photo = artistPhotos.find((p) => p.id === photoId);
                      if (!photo) return null;

                      const isOver = dragOverIndexRef.current === index;
                      const isDragging = draggedItem === photoId;

                      return (
                        <div
                          key={photoId}
                          draggable
                          onDragStart={(e) => handleDragStart(e, photoId)}
                          onDragOver={(e) => handleDragOver(e, index)}
                          onDragLeave={handleDragLeave}
                          onDrop={(e) => handleDrop(e, index)}
                          className="flex items-center gap-3 p-3 rounded-lg cursor-move transition-all"
                          style={{
                            backgroundColor: isDragging ? scheme.accent + "20" : isOver ? scheme.accent + "10" : scheme.secondaryBg,
                            opacity: isDragging ? 0.5 : 1,
                            borderLeft: isOver ? `3px solid ${scheme.accent}` : "3px solid transparent",
                          }}
                        >
                          <div
                            className="flex items-center justify-center flex-shrink-0 w-8 h-8 rounded font-bold text-sm"
                            style={{ backgroundColor: scheme.accent, color: "white" }}
                          >
                            {index + 1}
                          </div>
                          <img
                            src={photo.photoUrl}
                            alt="Photo"
                            className="w-14 h-14 rounded object-cover flex-shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium" style={{ color: scheme.text }}>
                              Photo {index + 1}
                            </p>
                            <p className="text-xs" style={{ color: scheme.divider }}>
                              {new Date(photo.uploadedAt).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="flex-shrink-0 text-2xl text-gray-400">
                            ≡
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Add Photo Button */}
              <div>
                <Button
                  variant="secondary"
                  onClick={() => (window.location.href = `/artwork/upload?artworkId=${artwork.id}`)}
                  className="w-full"
                >
                  📸 Add More Photos
                </Button>
              </div>
            </div>
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

              {/* Success/Error Messages */}
              {actionData?.success && (
                <div className="mb-4 p-3 rounded-lg bg-green-100 text-green-800 text-sm">
                  ✓ {actionData.message}
                </div>
              )}
              {actionData?.error && (
                <div className="mb-4 p-3 rounded-lg bg-red-100 text-red-800 text-sm">
                  ✗ {actionData.error}
                </div>
              )}

              {/* Save Button */}
              <Form method="POST" onSubmit={handleSave} className="mb-3">
                <input type="hidden" name="_intent" value="update-order" />
                <Button
                  type="submit"
                  variant="primary"
                  className="w-full"
                  disabled={navigation.state !== "idle" || selectedPhotos.length === 0}
                >
                  {navigation.state !== "idle" ? "Saving..." : "💾 Save Gallery"}
                </Button>
              </Form>

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
        />
      )}
    </div>
  );
}
