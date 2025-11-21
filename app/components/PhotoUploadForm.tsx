import { useRef, useState } from "react";
import { convertMobileImage, formatFileSize } from "~/lib/image-conversion.client";
import { createPhotoPreview } from "~/lib/exif.client";

interface PhotoUploadFormProps {
  latitude: number;
  longitude: number;
  address?: string;
  scheme: {
    primaryBg: string;
    secondaryBg: string;
    text: string;
    accent: string;
  };
  onSuccess?: (artworkId: string) => void;
  onCancel?: () => void;
}

export default function PhotoUploadForm({
  latitude,
  longitude,
  address,
  scheme,
  onSuccess,
  onCancel,
}: PhotoUploadFormProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [photoUrl, setPhotoUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPrivatePhoto, setIsPrivatePhoto] = useState(false);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setError(null);
    setLoading(true);

    try {
      const convertedFile = await convertMobileImage(selectedFile, {
        maxWidth: 2048,
        maxHeight: 2048,
        quality: 0.85,
      });

      setFile(convertedFile);

      const preview = await createPhotoPreview(convertedFile);
      setPhotoUrl(preview);
    } catch (err) {
      console.error("[PHOTO UPLOAD] Error converting image:", err);
      setError(
        err instanceof Error ? err.message : "Failed to process image"
      );
      setFile(null);
      setPhotoUrl("");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!file) {
      setError("Please select a photo");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("photoFile", file);
      formData.append("latitude", latitude.toString());
      formData.append("longitude", longitude.toString());
      formData.append("address", address || "");
      formData.append("isPrivateValue", isPrivatePhoto.toString());

      const response = await fetch("/api/artwork/upload-with-pin", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || `HTTP ${response.status}`);
      }

      const data = await response.json();

      if (data.success && data.artworkId) {
        onSuccess?.(data.artworkId);
      } else {
        throw new Error(data.error || "Upload failed");
      }
    } catch (err) {
      console.error("[PHOTO UPLOAD] Error uploading:", err);
      setError(
        err instanceof Error ? err.message : "Upload failed"
      );
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setFile(null);
    setPhotoUrl("");
    setError(null);
    onCancel?.();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div
          className="text-sm p-3 rounded-lg border"
          style={{
            backgroundColor: "#fee",
            borderColor: "#fcc",
            color: "#c33",
          }}
        >
          {error}
        </div>
      )}

      {!file ? (
        <div
          className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition hover:opacity-75"
          style={{
            borderColor: scheme.accent + "40",
          }}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />
          <p
            className="text-sm font-medium"
            style={{ color: scheme.text }}
          >
            📸 Select Photo
          </p>
          <p
            className="text-xs mt-1"
            style={{ color: scheme.text, opacity: 0.6 }}
          >
            Click to upload
          </p>
        </div>
      ) : (
        <>
          {photoUrl && (
            <div className="rounded-lg overflow-hidden">
              <img
                src={photoUrl}
                alt="Preview"
                className="w-full h-40 object-cover"
              />
            </div>
          )}

          <div
            className="text-xs p-3 rounded-lg"
            style={{ backgroundColor: scheme.secondaryBg }}
          >
            <p style={{ color: scheme.text }}>
              📁 {file.name} ({formatFileSize(file.size)})
            </p>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isPrivate"
              checked={isPrivatePhoto}
              onChange={(e) => setIsPrivatePhoto(e.target.checked)}
              className="h-3 w-3 rounded"
              style={{ accentColor: scheme.accent }}
            />
            <label
              htmlFor="isPrivate"
              className="text-xs"
              style={{ color: scheme.text }}
            >
              Keep private
            </label>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleCancel}
              disabled={loading}
              className="flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all"
              style={{
                backgroundColor: scheme.secondaryBg,
                color: scheme.text,
                opacity: loading ? 0.5 : 1,
              }}
            >
              ← Back
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-3 py-2 rounded-lg text-sm font-medium text-white transition-all"
              style={{
                backgroundColor: scheme.accent,
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? "Uploading..." : "✓ Upload"}
            </button>
          </div>
        </>
      )}
    </form>
  );
}
