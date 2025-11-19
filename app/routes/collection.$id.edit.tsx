import { redirect, Form, useActionData, useRouteLoaderData } from "react-router";
import type { Route } from "./+types/collection.$id.edit";
import { Header } from "~/components/Header";
import { useTheme } from "~/lib/useTheme";

type LoaderData = {
  collection: any;
  isOwner: boolean;
};

type ActionData = {
  error?: string;
  success?: boolean;
};

export const loader: Route.LoaderFunction = async ({ params, request }) => {
  const { getAuthTokenFromCookie, getUserFromToken } = await import("~/lib/auth.server");
  const { getCollection } = await import("~/lib/collections.server");

  const { id } = params;

  if (!id) {
    throw new Error("Collection ID is required");
  }

  const cookieHeader = request.headers.get("cookie");
  const token = getAuthTokenFromCookie(cookieHeader);
  const user = getUserFromToken(token);

  if (!user) {
    return redirect("/auth/login");
  }

  try {
    const collection = await getCollection(id);

    if (!collection) {
      throw new Response("Collection not found", { status: 404 });
    }

    const isOwner = user.id === collection.userId;

    if (!isOwner) {
      throw new Response("Unauthorized", { status: 403 });
    }

    return {
      collection,
      isOwner,
    };
  } catch (error) {
    console.error("[COLLECTION EDIT] Error loading collection:", error);
    throw error;
  }
};

export const action: Route.ActionFunction = async ({ request, params }) => {
  const { getAuthTokenFromCookie, getUserFromToken } = await import("~/lib/auth.server");
  const { getCollection, updateCollection, addArtworkToCollection } = await import("~/lib/collections.server");

  const cookieHeader = request.headers.get("cookie");
  const token = getAuthTokenFromCookie(cookieHeader);
  const user = getUserFromToken(token);
  const { id } = params;

  if (!user) {
    return redirect("/auth/login");
  }

  const collection = await getCollection(id!);
  if (!collection || collection.userId !== user.id) {
    return { error: "Unauthorized" };
  }

  if (request.method === "POST") {
    const formData = await request.formData();
    const action = formData.get("_action");

    if (action === "update") {
      const name = formData.get("name") as string;
      const description = formData.get("description") as string;
      const isPublic = formData.get("isPublic") === "on";

      if (!name || name.trim().length === 0) {
        return { error: "Collection name is required" };
      }

      try {
        await updateCollection(id!, {
          name: name.trim(),
          description: description.trim() || undefined,
          isPublic,
        });

        return redirect(`/collection/${id}`);
      } catch (error) {
        console.error("[COLLECTION EDIT] Error updating collection:", error);
        return { error: "Failed to update collection" };
      }
    }

    if (action === "add-artwork") {
      const artworkId = formData.get("artworkId") as string;
      const artworkTitle = formData.get("artworkTitle") as string;

      try {
        await addArtworkToCollection(id!, artworkId);
        return { success: true, addedArtwork: artworkTitle };
      } catch (error: any) {
        if (error.code === "P2002") {
          return { error: "This artwork is already in your collection" };
        }
        console.error("[COLLECTION EDIT] Error adding artwork:", error);
        return { error: "Failed to add artwork" };
      }
    }
  }

  return null;
};

export default function EditCollectionPage() {
  const rootData = useRouteLoaderData("root") as any;
  const loaderData = useRouteLoaderData("routes/collection.$id.edit") as LoaderData;
  const actionData = useActionData() as ActionData;
  const { collection } = loaderData;
  const { scheme, noiseColor } = useTheme();

  if (!collection) {
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
        <main className="max-w-4xl mx-auto px-4 py-12">
          <div className="text-center" style={{ color: scheme.text }}>
            <h1 className="text-2xl font-bold mb-4">
              Wall Not Found
            </h1>
            <a href="/user/profile" className="font-medium hover:opacity-80" style={{ color: scheme.accent }}>
              ← Back to Profile
            </a>
          </div>
        </main>
      </div>
    );
  }

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
            href={`/collection/${collection.id}`}
            className="text-blue-600 hover:text-blue-700 font-medium flex items-center gap-2"
          >
            ← Back to Wall
          </a>
        </div>

        {/* Edit Form */}
        <div className="bg-white rounded-lg shadow-md p-8 mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">Edit Wall</h1>

          {actionData?.error && (
            <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {actionData.error}
            </div>
          )}

          <Form method="post" className="space-y-6">
            <input type="hidden" name="_action" value="update" />

            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                Wall Name *
              </label>
              <input
                type="text"
                id="name"
                name="name"
                required
                defaultValue={collection.name}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                id="description"
                name="description"
                rows={4}
                defaultValue={collection.description || ""}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="isPublic"
                name="isPublic"
                defaultChecked={collection.isPublic}
                className="h-4 w-4 text-blue-600 rounded"
              />
              <label htmlFor="isPublic" className="text-sm font-medium text-gray-700">
                Make this collection public
              </label>
            </div>

            <div className="flex gap-4 pt-6">
              <a
                href={`/collection/${collection.id}`}
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

        {/* Add Artwork Section */}
        <div className="bg-white rounded-lg shadow-md p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Add Artwork to Collection</h2>

          {actionData?.success && actionData?.addedArtwork && (
            <div className="mb-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
              Successfully added "{actionData.addedArtwork}" to collection
            </div>
          )}

          <SearchAndAddArtwork collectionId={collection.id} />
        </div>
      </main>
    </div>
  );
}

function SearchAndAddArtwork({ collectionId }: { collectionId: string }) {
  return (
    <div className="space-y-4">
      <p className="text-gray-600 text-sm">
        Visit any artwork page and use the "Add to Collection" button to add artworks to this collection.
      </p>
      <a
        href="/"
        className="inline-block bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
      >
        Browse Artworks
      </a>
    </div>
  );
}
