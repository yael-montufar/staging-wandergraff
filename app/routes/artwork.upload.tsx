import { redirect, useRouteLoaderData } from "react-router";
import { type LoaderFunction } from "react-router";
import { useRef, useState } from "react";
import { getAuthTokenFromCookie } from "~/lib/auth.server";
import { createPhotoPreview } from "~/lib/exif.client";
import { convertMobileImage, formatFileSize } from "~/lib/image-conversion.client";
import { useTheme } from "~/lib/useTheme";

type LoaderData = {
  artworkId: string;
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

// Upload logic moved to /api/artwork/upload route

export default function UploadPhotoPage() {
  const loaderData = useRouteLoaderData("routes/artwork.upload") as LoaderData;
  const { scheme, noiseColor } = useTheme();
  const formRef = useRef<HTMLFormElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [photoUrl, setPhotoUrl] = useState("");
  const [isPrivatePhoto, setIsPrivatePhoto] = useState(false);

  // Get artwork ID from loader data (validated in loader)
  const artworkId = loaderData?.artworkId || "";

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setLoading(true);

    try {
      // Convert mobile image formats (HEIC, etc.) to web-friendly JPEG
      console.log("[UPLOAD] Converting image format...");
      const convertedFile = await convertMobileImage(selectedFile, {
        maxWidth: 2048,
        maxHeight: 2048,
        quality: 0.85,
      });

      setFile(convertedFile);
      console.log(
        "[UPLOAD] File converted:",
        selectedFile.name,
        `(${formatFileSize(selectedFile.size)})`,
        "→",
        convertedFile.name,
        `(${formatFileSize(convertedFile.size)})`
      );

      // Create preview from converted file
      const preview = await createPhotoPreview(convertedFile);
      setPhotoUrl(preview);
    } catch (error) {
      console.error("[UPLOAD] Error converting image:", error);
      alert(
        error instanceof Error
          ? error.message
          : "Failed to process image. Please try a different file."
      );
      setFile(null);
      setPhotoUrl("");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!file) {
      return;
    }

    setLoading(true);
    console.log("[UPLOAD] Submitting form with converted file:", file.name, "artworkId:", artworkId);

    // Create FormData with the CONVERTED file (not the original)
    const formData = new FormData();
    formData.append("photoFile", file); // This is the converted file from state
    formData.append("artworkId", artworkId);
    formData.append("isPrivateValue", isPrivatePhoto.toString());

    // Submit via fetch to dedicated API endpoint
    fetch("/api/artwork/upload", {
      method: "POST",
      body: formData,
    })
      .then((res) => {
        console.log("[UPLOAD] Response status:", res.status);
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        }
        return res.json();
      })
      .then((data) => {
        console.log("[UPLOAD] Response data:", data);
        if (data.success) {
          console.log("[UPLOAD] Success! Converted file uploaded. Redirecting...");
          window.location.href = `/artwork/${artworkId}`;
        } else {
          console.error("[UPLOAD] Server error:", data.error);
          alert(data.error || "Upload failed");
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error("[UPLOAD] Fetch error:", err);
        alert("Upload error: " + (err instanceof Error ? err.message : "Unknown error"));
        setLoading(false);
      });
  };


  return (
    <div
      className="min-h-screen relative flex items-center justify-center py-12 px-4"
      suppressHydrationWarning
      style={{
        backgroundColor: scheme.primaryBg,
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='2.5' numOctaves='4' seed='2'/%3E%3CfeColorMatrix type='saturate' values='0.08'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' fill='%23${noiseColor}' filter='url(%23noise)' opacity='0.5'/%3E%3C/svg%3E")`,
        backgroundAttachment: "fixed",
      }}
    >
      <div className="max-w-2xl w-full">
        <div className="bg-white rounded-lg shadow-md p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">📸 Add Photo</h1>
          <p className="text-gray-600 mb-6">Share your photo of this artwork.</p>

          <form ref={formRef} onSubmit={handleSubmit} className="space-y-6">
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-500 transition">
              <input
                ref={fileInputRef}
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
                    name="isPrivate"
                  />
                  <label htmlFor="isPrivate" className="text-sm text-gray-700">
                    Keep photo private (don't show in gallery)
                  </label>
                </div>


                <div className="flex gap-4 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setFile(null);
                      setPhotoUrl("");
                      // Reset file input
                      const fileInput = document.getElementById("photo-input") as HTMLInputElement;
                      if (fileInput) fileInput.value = "";
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
