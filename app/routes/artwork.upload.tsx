import { type ActionFunction, redirect, useActionData } from "react-router";
import { type LoaderFunction } from "react-router";
import { useRef, useState } from "react";
import { getAuthTokenFromCookie, getUserFromToken } from "~/lib/auth.server";
import { createPhotoPreview } from "~/lib/exif.client";

type ActionData = {
  error?: string;
  success?: boolean;
  photoId?: string;
};

export const loader: LoaderFunction = ({ request }) => {
  const cookieHeader = request.headers.get("cookie");
  const token = getAuthTokenFromCookie(cookieHeader);

  if (!token) {
    return redirect("/auth/login");
  }

  const url = new URL(request.url);
  const artworkId = url.searchParams.get("artworkId");
  if (!artworkId) {
    return redirect("/");
  }

  return { artworkId };
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
  const photoUrl = formData.get("photoUrl") as string;
  const artworkId = formData.get("artworkId") as string;
  const isPrivate = formData.get("isPrivate") === "true";

  if (!photoUrl || !artworkId) {
    return { error: "Photo URL and artwork ID are required" };
  }

  try {
    const { createPhoto } = await import("~/lib/photos.server");

    const photo = await createPhoto(
      user.id,
      photoUrl,
      new Date(),
      {
        artworkId: isPrivate ? undefined : artworkId,
        isPrivate,
      }
    );

    return { success: true, photoId: photo.id };
  } catch (error) {
    console.error("[UPLOAD] Upload error:", error);
    return {
      error: error instanceof Error ? error.message : "Failed to upload photo",
    };
  }
};

export default function UploadPhotoPage() {
  const actionData = useActionData<ActionData>();
  const formRef = useRef<HTMLFormElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [photoUrl, setPhotoUrl] = useState("");
  const [isPrivatePhoto, setIsPrivatePhoto] = useState(false);

  // Get artwork ID from query params
  const params = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
  const artworkId = params.get("artworkId") || "";

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setLoading(true);

    try {
      const preview = await createPhotoPreview(selectedFile);
      setPhotoUrl(preview);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (file && formRef.current) {
      formRef.current.submit();
    }
  };

  if (actionData?.success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
        <div className="max-w-md w-full text-center">
          <div className="rounded-full bg-green-100 p-6 w-16 h-16 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Photo Uploaded!</h2>
          <p className="text-gray-600 mb-6">Your photo has been successfully added to the artwork.</p>
          <a href={`/artwork/${artworkId}`} className="inline-block bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700">
            View Artwork
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
      <div className="max-w-2xl w-full">
        <div className="bg-white rounded-lg shadow-md p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">📸 Add Photo</h1>
          <p className="text-gray-600 mb-6">Share your photo of this artwork.</p>

          {actionData?.error && (
            <div className="rounded-md bg-red-50 p-4 border border-red-200 mb-6">
              <p className="text-sm font-medium text-red-800">{actionData.error}</p>
            </div>
          )}

          <form ref={formRef} method="POST" onSubmit={handleSubmit} className="space-y-6">
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
                <p className="text-xs text-gray-500">PNG, JPG, GIF up to 10MB</p>
              </label>
            </div>

            {loading && (
              <div className="text-center">
                <p className="text-sm text-gray-600">Processing photo...</p>
              </div>
            )}

            {file && !loading && (
              <div className="bg-gray-50 p-4 rounded-md">
                <p className="text-sm font-medium text-gray-900">📁 {file.name}</p>
                {photoUrl && (
                  <img src={photoUrl} alt="Preview" className="mt-4 max-h-64 mx-auto rounded-md" />
                )}
              </div>
            )}

            {file && (
              <>
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

                <input type="hidden" name="photoUrl" value={photoUrl} />
                <input type="hidden" name="artworkId" value={artworkId} />
                <input type="hidden" name="isPrivate" value={isPrivatePhoto.toString()} />

                <div className="flex gap-4 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setFile(null);
                      setPhotoUrl("");
                    }}
                    className="flex-1 bg-gray-200 text-gray-900 px-4 py-2 rounded-md hover:bg-gray-300 font-medium"
                  >
                    ← Back
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
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
