import { redirect, Form, useActionData, useRouteLoaderData } from "react-router";
import type { Route } from "./+types/collection.new";
import { Header } from "~/components/Header";
import { useTheme } from "~/lib/useTheme";

type ActionData = {
  error?: string;
  success?: boolean;
};

export const loader: Route.LoaderFunction = async ({ request }) => {
  const { getAuthTokenFromCookie, getUserFromToken } = await import("~/lib/auth.server");

  const cookieHeader = request.headers.get("cookie");
  const token = getAuthTokenFromCookie(cookieHeader);
  const user = getUserFromToken(token);

  if (!user) {
    return redirect("/auth/login");
  }

  return { user };
};

export const action: Route.ActionFunction = async ({ request }) => {
  const { getAuthTokenFromCookie, getUserFromToken } = await import("~/lib/auth.server");
  const { createCollection } = await import("~/lib/collections.server");

  const cookieHeader = request.headers.get("cookie");
  const token = getAuthTokenFromCookie(cookieHeader);
  const user = getUserFromToken(token);

  if (!user) {
    return redirect("/auth/login");
  }

  if (request.method === "POST") {
    const formData = await request.formData();
    const name = formData.get("name") as string;
    const description = formData.get("description") as string;
    const isPublic = formData.get("isPublic") === "on";

    if (!name || name.trim().length === 0) {
      return { error: "Collection name is required" };
    }

    try {
      const collection = await createCollection(user.id, name.trim(), {
        description: description.trim() || undefined,
        isPublic,
      });

      return redirect(`/collection/${collection.id}`);
    } catch (error) {
      console.error("[COLLECTION] Error creating collection:", error);
      return { error: "Failed to create collection" };
    }
  }

  return null;
};

export default function NewCollectionPage() {
  const rootData = useRouteLoaderData("root") as any;
  const actionData = useActionData() as ActionData;
  const { scheme, noiseColor } = useTheme();

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
        <div className="mb-8">
          <a
            href="/user/profile"
            className="text-blue-600 hover:text-blue-700 font-medium flex items-center gap-2"
          >
            ← Back to Profile
          </a>
        </div>

        <div className="bg-white rounded-lg shadow-md p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">
            Create New Wall
          </h1>

          {actionData?.error && (
            <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {actionData.error}
            </div>
          )}

          <Form method="post" className="space-y-6">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                Wall Name *
              </label>
              <input
                type="text"
                id="name"
                name="name"
                required
                placeholder="e.g., Downtown Murals, Portrait Artists"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
              <p className="text-xs text-gray-500 mt-1">
                Give your wall a descriptive name
              </p>
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                id="description"
                name="description"
                rows={4}
                placeholder="Tell people what this wall is about..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
              <p className="text-xs text-gray-500 mt-1">
                Optional. Help others understand your wall
              </p>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="isPublic"
                name="isPublic"
                className="h-4 w-4 text-blue-600 rounded"
              />
              <label htmlFor="isPublic" className="text-sm font-medium text-gray-700">
                Make this wall public
              </label>
            </div>
            <p className="text-xs text-gray-600 ml-7">
              Public walls can be discovered by other users
            </p>

            <div className="flex gap-4 pt-6">
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
                Create Wall
              </button>
            </div>
          </Form>
        </div>
      </main>
    </div>
  );
}
