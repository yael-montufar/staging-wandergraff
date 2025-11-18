import { type ActionFunction, redirect, useActionData } from "react-router";
import { type LoaderFunction } from "react-router";
import { useRef, useState } from "react";
import { getAuthTokenFromCookie, getUserFromToken } from "~/lib/auth.server";
import { extractExifData, createPhotoPreview, formatCoordinate } from "~/lib/exif.client";

type ActionData = {
  error?: string;
  success?: boolean;
  nearbyArtworks?: Array<{
    id: string;
    title: string;
    latitude: number;
    longitude: number;
  }>;
  photoId?: string;
};

type ExifData = {
  latitude?: number;
  longitude?: number;
  dateTime?: string;
};

export const loader: LoaderFunction = ({ request }) => {
  const cookieHeader = request.headers.get("cookie");
  const token = getAuthTokenFromCookie(cookieHeader);

  if (!token) {
    return redirect("/auth/login");
  }

  return {};
};

export const action: ActionFunction = async ({ request }): Promise<ActionData | Response> => {
  if (request.method !== "POST") {
    return { error: "Method not allowed" };
  }

  const cookieHeader = request.headers.get("cookie");
  const token = getAuthTokenFromCookie(cookieHeader);
  const user = getUserFromToken(token);

  if (!user) {
    return { error: "Not authenticated" };
  }

  const formData = await request.formData();
  const actionType = formData.get("_action") as string;

  if (actionType === "upload-photo") {
    // Import server-only modules here
    const { createPhoto } = await import("~/lib/photos.server");
    const { createArtwork } = await import("~/lib/artworks.server");

    const photoUrl = formData.get("photoUrl") as string;
    const takenAt = formData.get("takenAt") as string;
    const exifLatitude = formData.get("exifLatitude") as string;
    const exifLongitude = formData.get("exifLongitude") as string;
    const isPrivate = formData.get("isPrivate") === "true";
    const artworkTitle = formData.get("artworkTitle") as string;
    const existingArtworkId = (formData.get("existingArtworkId") || null) as string | null;

    if (!photoUrl || !takenAt) {
      return { error: "Photo URL and taken at date are required" };
    }

    try {
      let artworkId = existingArtworkId;

      if (!artworkId) {
        if (!artworkTitle) {
          return { error: "Artwork title is required for new artworks" };
        }

        const latitude = parseFloat(exifLatitude);
        const longitude = parseFloat(exifLongitude);

        if (isNaN(latitude) || isNaN(longitude)) {
          return { error: "Valid coordinates are required to create artwork" };
        }

        const artwork = await createArtwork(
          artworkTitle,
          latitude,
          longitude,
          user.id
        );
        artworkId = artwork.id;
      }

      const photo = await createPhoto(
        user.id,
        photoUrl,
        new Date(takenAt),
        {
          artworkId: isPrivate ? undefined : artworkId,
          isPrivate,
          exifLatitude: exifLatitude ? parseFloat(exifLatitude) : undefined,
          exifLongitude: exifLongitude ? parseFloat(exifLongitude) : undefined,
        }
      );

      return { success: true, photoId: photo.id };
    } catch (error) {
      console.error("[UPLOAD] Upload error:", error);
      return {
        error: error instanceof Error ? error.message : "Failed to upload photo",
      };
    }
  }

  return { error: "Invalid action" };
};

export default function UploadPhotoPage() {
  const actionData = useActionData<ActionData>();
  const formRef = useRef<HTMLFormElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [exifData, setExifData] = useState<ExifData>({});
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<"upload" | "review" | "complete">("upload");
  const [photoUrl, setPhotoUrl] = useState("");
  const [artworkTitle, setArtworkTitle] = useState("");
  const [isPrivatePhoto, setIsPrivatePhoto] = useState(false);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setLoading(true);

    try {
      const exif = await extractExifData(selectedFile);
      setExifData(exif);

      const preview = await createPhotoPreview(selectedFile);
      setPhotoUrl(preview);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (step === "upload" && file && exifData.latitude && exifData.longitude) {
      setStep("review");
    }
  };

  if (step === "complete" && actionData?.success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
        <div className="max-w-md w-full text-center">
          <div className="rounded-full bg-green-100 p-6 w-16 h-16 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Photo Uploaded!</h2>
          <p className="text-gray-600 mb-6">Your photo has been successfully uploaded and added to the artwork gallery.</p>
          <a href="/" className="inline-block bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">
            Back to Home
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
      <div className="max-w-2xl w-full">
        <div className="bg-white rounded-lg shadow-md p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Upload Street Art Photo</h1>
          <p className="text-gray-600 mb-6">Share a photo of street art you've discovered. Your photo's GPS coordinates will be extracted.</p>

          {actionData?.error && (
            <div className="rounded-md bg-red-50 p-4 border border-red-200 mb-6">
              <p className="text-sm font-medium text-red-800">{actionData.error}</p>
            </div>
          )}

          <form ref={formRef} method="POST" onSubmit={handleSubmit} className="space-y-6">
            {step === "upload" && (
              <>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-500 transition">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="hidden"
                    id="photo-input"
                  />
                  <label htmlFor="photo-input" className="cursor-pointer block">
                    <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                      <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-12l-3.172-3.172a4 4 0 00-5.656 0L28 20M9 20l3.172-3.172a4 4 0 015.656 0L28 20" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <p className="mt-2 text-sm font-medium text-gray-900">
                      Click to upload or drag and drop
                    </p>
                    <p className="text-xs text-gray-500">PNG, JPG, GIF up to 10MB (with GPS EXIF data)</p>
                  </label>
                </div>

                {loading && (
                  <div className="text-center">
                    <p className="text-sm text-gray-600">Extracting EXIF data...</p>
                  </div>
                )}

                {file && !loading && (
                  <div className="bg-gray-50 p-4 rounded-md">
                    <p className="text-sm font-medium text-gray-900">📁 {file.name}</p>
                    {photoUrl && (
                      <img src={photoUrl} alt="Preview" className="mt-4 max-h-64 mx-auto rounded-md" />
                    )}
                    {exifData.latitude && exifData.longitude && (
                      <div className="mt-4 text-sm text-gray-700 space-y-1">
                        <p>✓ 📍 Coordinates: {formatCoordinate(exifData.latitude)}, {formatCoordinate(exifData.longitude)}</p>
                        {exifData.dateTime && <p>✓ 📅 Date: {new Date(exifData.dateTime).toLocaleDateString()}</p>}
                      </div>
                    )}
                    {(!exifData.latitude || !exifData.longitude) && (
                      <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded text-sm text-amber-800">
                        <p>⚠️ No GPS coordinates found in photo EXIF data</p>
                        <p className="text-xs mt-1">Your photo needs location data to be added to an artwork. Please upload a photo taken with location services enabled.</p>
                      </div>
                    )}
                  </div>
                )}

                {file && exifData.latitude && exifData.longitude && (
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 font-medium"
                  >
                    Next: Review Photo
                  </button>
                )}
              </>
            )}

            {step === "review" && file && (
              <>
                <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                  <p className="text-sm text-blue-800">📍 Location: {formatCoordinate(exifData.latitude || 0)}, {formatCoordinate(exifData.longitude || 0)}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">
                    Artwork Title *
                  </label>
                  <input
                    type="text"
                    value={artworkTitle}
                    onChange={(e) => setArtworkTitle(e.target.value)}
                    placeholder="e.g., Red Building Mural, Downtown Phoenix"
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <p className="mt-1 text-xs text-gray-500">Enter a descriptive title for this artwork</p>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isPrivate"
                    checked={isPrivatePhoto}
                    onChange={(e) => setIsPrivatePhoto(e.target.checked)}
                    className="h-4 w-4 text-blue-600 rounded"
                  />
                  <label htmlFor="isPrivate" className="text-sm text-gray-700">
                    Keep photo private (don't show in gallery)
                  </label>
                </div>

                <input type="hidden" name="_action" value="upload-photo" />
                <input type="hidden" name="photoUrl" value={photoUrl} />
                <input type="hidden" name="takenAt" value={exifData.dateTime || new Date().toISOString()} />
                <input type="hidden" name="exifLatitude" value={exifData.latitude?.toString() || ""} />
                <input type="hidden" name="exifLongitude" value={exifData.longitude?.toString() || ""} />
                <input type="hidden" name="artworkTitle" value={artworkTitle} />
                <input type="hidden" name="isPrivate" value={isPrivatePhoto.toString()} />

                <div className="flex gap-4 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setStep("upload");
                      setFile(null);
                      setExifData({});
                      setPhotoUrl("");
                      setArtworkTitle("");
                    }}
                    className="flex-1 bg-gray-200 text-gray-900 px-4 py-2 rounded-md hover:bg-gray-300 font-medium"
                  >
                    ← Back
                  </button>
                  <button
                    type="submit"
                    disabled={!artworkTitle || loading}
                    className="flex-1 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:opacity-50 font-medium"
                  >
                    {loading ? "Uploading..." : "✓ Upload Photo"}
                  </button>
                </div>
              </>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
