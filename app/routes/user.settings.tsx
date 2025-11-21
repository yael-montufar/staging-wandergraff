import { redirect, Form, useActionData, useRouteLoaderData } from "react-router";
import type { Route } from "./+types/user.settings";
import { Header } from "~/components/Header";
import { useState, useRef, useEffect } from "react";
import { useTheme } from "~/lib/useTheme";

type LoaderData = {
  userDetails: {
    id: string;
    name: string;
    email: string;
    bio?: string;
    avatarUrl?: string;
  };
};

type ActionData = {
  error?: string;
  success?: boolean;
};

export const loader: Route.LoaderFunction = async ({ request }) => {
  const { getAuthTokenFromCookie, getUserFromToken } = await import("~/lib/auth.server");
  const { prismaClient } = await import("~/lib/db.server");

  const cookieHeader = request.headers.get("cookie");
  const token = getAuthTokenFromCookie(cookieHeader);
  const user = getUserFromToken(token);

  if (!user) {
    return redirect("/auth/login");
  }

  try {
    const prisma = await prismaClient();
    const userDetails = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        name: true,
        email: true,
        bio: true,
        avatarUrl: true,
      },
    });

    if (!userDetails) {
      throw new Error("User not found");
    }

    return { userDetails };
  } catch (error) {
    console.error("[SETTINGS] Error loading user:", error);
    throw error;
  }
};

export const action: Route.ActionFunction = async ({ request }) => {
  const { getAuthTokenFromCookie, getUserFromToken } = await import("~/lib/auth.server");
  const { prismaClient } = await import("~/lib/db.server");

  const cookieHeader = request.headers.get("cookie");
  const token = getAuthTokenFromCookie(cookieHeader);
  const user = getUserFromToken(token);

  if (!user) {
    return redirect("/auth/login");
  }

  if (request.method === "POST") {
    const formData = await request.formData();
    const name = formData.get("name") as string;
    const bio = formData.get("bio") as string;

    if (!name || name.trim().length === 0) {
      return { error: "Name is required" };
    }

    try {
      const prisma = await prismaClient();
      await prisma.user.update({
        where: { id: user.id },
        data: {
          name: name.trim(),
          bio: bio ? bio.trim() : null,
        },
      });

      return { success: true };
    } catch (error) {
      console.error("[SETTINGS] Error updating user:", error);
      return { error: "Failed to update settings" };
    }
  }

  return null;
};

export default function SettingsPage() {
  const rootData = useRouteLoaderData("root") as any;
  const { scheme, noiseColor } = useTheme();
  const loaderData = useRouteLoaderData("routes/user.settings") as LoaderData;
  const actionData = useActionData() as ActionData;
  const { userDetails } = loaderData;

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reload page when form is submitted successfully to propagate changes
  useEffect(() => {
    if (actionData?.success) {
      setTimeout(() => {
        window.location.href = window.location.href;
      }, 1000);
    }
  }, [actionData?.success]);

  const initials = userDetails.name
    ? userDetails.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
    : userDetails.email[0].toUpperCase();

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      setUploadMessage({ type: "error", text: "Please select an image file" });
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      setUploadMessage({ type: "error", text: "File size must be less than 5MB" });
      return;
    }

    setSelectedFile(file);
    setUploadMessage(null);

    // Create preview
    const reader = new FileReader();
    reader.onload = (event) => {
      setPreviewUrl(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleAvatarUpload = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("avatarFile", selectedFile);

      const response = await fetch("/api/user/upload-avatar", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setUploadMessage({ type: "success", text: "Avatar uploaded successfully!" });
        setSelectedFile(null);
        setPreviewUrl(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
        // Reload page to show updated avatar (hard refresh)
        setTimeout(() => {
          window.location.href = window.location.href;
        }, 1500);
      } else {
        setUploadMessage({ type: "error", text: data.error || "Failed to upload avatar" });
      }
    } catch (error) {
      setUploadMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Upload failed",
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div
      className="min-h-screen relative"
      suppressHydrationWarning
      style={{
        backgroundColor: scheme.primaryBg,
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='2.5' numOctaves='4' seed='2'/%3E%3CfeColorMatrix type='saturate' values='0.08'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' fill='%23${noiseColor}' filter='url(%23noise)' opacity='0.5'/%3E%3C/svg%3E")`,
        backgroundAttachment: "fixed",
      }}
    >
      <Header user={rootData?.user} />

      <main className="max-w-2xl mx-auto px-4 py-12">
        {/* Back Button */}
        <div className="mb-8">
          <a
            href="/user/profile"
            className="text-blue-600 hover:text-blue-700 font-medium flex items-center gap-2"
          >
            ← Back to Dashboard
          </a>
        </div>

        {/* Avatar Upload Card */}
        <div className="bg-white rounded-lg shadow-md p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Profile Picture</h2>

          {uploadMessage && (
            <div
              className={`mb-6 px-4 py-3 rounded border ${
                uploadMessage.type === "success"
                  ? "bg-green-50 border-green-200 text-green-700"
                  : "bg-red-50 border-red-200 text-red-700"
              }`}
            >
              {uploadMessage.text}
            </div>
          )}

          <div className="space-y-6">
            {/* Current Avatar */}
            <div>
              <p className="text-sm font-medium text-gray-700 mb-3">Current Avatar</p>
              <div className="flex items-center gap-4">
                {userDetails.avatarUrl ? (
                  <img
                    src={userDetails.avatarUrl}
                    alt={userDetails.name}
                    className="w-24 h-24 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-full bg-blue-600 text-white font-semibold flex items-center justify-center text-2xl">
                    {initials}
                  </div>
                )}
                <div className="text-sm text-gray-600">
                  {userDetails.avatarUrl ? (
                    <p>Custom image uploaded</p>
                  ) : (
                    <p>Auto-generated from your name initials</p>
                  )}
                </div>
              </div>
            </div>

            {/* Preview */}
            {previewUrl && (
              <div>
                <p className="text-sm font-medium text-gray-700 mb-3">Preview</p>
                <img
                  src={previewUrl}
                  alt="Avatar preview"
                  className="w-24 h-24 rounded-full object-cover"
                />
              </div>
            )}

            {/* File Input */}
            <div>
              <label htmlFor="avatar" className="block text-sm font-medium text-gray-700 mb-2">
                Upload New Picture
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-500 transition">
                <input
                  ref={fileInputRef}
                  type="file"
                  id="avatar"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <label htmlFor="avatar" className="cursor-pointer block">
                  <svg className="mx-auto h-8 w-8 text-gray-400 mb-2" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                    <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-12l-3.172-3.172a4 4 0 00-5.656 0L28 20M9 20l3.172-3.172a4 4 0 015.656 0L28 20" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <p className="mt-2 text-sm font-medium text-gray-900">Click to upload or drag and drop</p>
                  <p className="text-xs text-gray-500">PNG, JPG, GIF, WEBP up to 5MB</p>
                </label>
              </div>
            </div>

            {/* Upload Button */}
            {selectedFile && (
              <button
                onClick={handleAvatarUpload}
                disabled={isUploading}
                className="w-full bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium transition"
              >
                {isUploading ? "Uploading..." : "Upload Avatar"}
              </button>
            )}

            {/* Info */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-900">
                💡 Your avatar will be optimized and processed for the best display across the platform.
              </p>
            </div>
          </div>
        </div>

        {/* Settings Card */}
        <div className="bg-white rounded-lg shadow-md p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Account Settings</h1>

          {actionData?.success && (
            <div className="mb-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
              ✓ Settings updated successfully
            </div>
          )}

          {actionData?.error && (
            <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {actionData.error}
            </div>
          )}

          <Form method="post" className="space-y-6">
            {/* Email (Read-only) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <input
                type="email"
                value={userDetails.email}
                disabled
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600 cursor-not-allowed"
              />
              <p className="text-xs text-gray-500 mt-1">
                Email address cannot be changed. Contact support if you need to update it.
              </p>
            </div>

            {/* Name */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                Display Name *
              </label>
              <input
                type="text"
                id="name"
                name="name"
                required
                defaultValue={userDetails.name}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
              <p className="text-xs text-gray-500 mt-1">
                This name will appear on your profile and photos you upload
              </p>
            </div>

            {/* Bio */}
            <div>
              <label htmlFor="bio" className="block text-sm font-medium text-gray-700 mb-2">
                Bio
              </label>
              <textarea
                id="bio"
                name="bio"
                rows={4}
                defaultValue={userDetails.bio || ""}
                placeholder="Tell the community about yourself..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
              <p className="text-xs text-gray-500 mt-1">
                Optional. Visible on your public profile.
              </p>
            </div>

            {/* Save Button */}
            <div className="flex gap-4 pt-6 border-t">
              <a
                href="/user/profile"
                className="flex-1 text-center bg-gray-200 text-gray-900 px-6 py-2 rounded-lg hover:bg-gray-300 font-medium transition"
              >
                Cancel
              </a>
              <button
                type="submit"
                className="flex-1 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 font-medium transition"
              >
                Save Changes
              </button>
            </div>
          </Form>
        </div>

        {/* Danger Zone */}
        <div className="mt-12 bg-white rounded-lg shadow-md p-8 border-l-4 border-red-600">
          <h2 className="text-lg font-bold text-red-600 mb-4">Danger Zone</h2>
          <p className="text-gray-600 mb-4">
            Once you delete your account, there is no going back. Please be certain.
          </p>
          <button
            disabled
            className="bg-red-100 text-red-700 px-4 py-2 rounded-lg cursor-not-allowed"
            title="Account deletion coming soon"
          >
            Delete Account (Coming Soon)
          </button>
        </div>
      </main>
    </div>
  );
}
