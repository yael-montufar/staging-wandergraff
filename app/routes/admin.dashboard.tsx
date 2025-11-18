import { type LoaderFunction, type ActionFunction, redirect, useLoaderData, useActionData, useSearchParams } from "react-router";
import { useState, useRef } from "react";
import { getAuthTokenFromCookie, getUserFromToken } from "~/lib/auth.server";

type LoaderData = {
  artworks: Array<{
    id: string;
    title: string;
    address: string | null;
    latitude: number;
    longitude: number;
    claimStatus: string;
    createdAt: string;
    createdBy: { name: string; email: string };
    artist: { name: string } | null;
    photos: Array<{ photoUrl: string }>;
  }>;
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
};

type ActionData = {
  error?: string;
  success?: boolean;
  deletedId?: string;
};

export const loader: LoaderFunction = async ({ request }) => {
  const cookieHeader = request.headers.get("cookie");
  const token = getAuthTokenFromCookie(cookieHeader);
  const user = getUserFromToken(token);

  if (!user) {
    return redirect("/");
  }

  // Fetch user from database to get current role
  const { prismaClient } = await import("~/lib/db.server");
  const prisma = await prismaClient();
  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { role: true },
  });

  if (!dbUser || dbUser.role !== "ADMIN") {
    return redirect("/");
  }

  const url = new URL(request.url);
  const search = url.searchParams.get("search") || "";
  const claimStatus = url.searchParams.get("claimStatus") || "ALL";
  const page = parseInt(url.searchParams.get("page") || "1", 10);
  const limit = 20;
  const offset = (page - 1) * limit;

  const { getAllArtworks } = await import("~/lib/artworks.server");

  const result = await getAllArtworks({
    search: search || undefined,
    claimStatus: claimStatus === "ALL" ? undefined : claimStatus,
    limit,
    offset,
  });

  return {
    artworks: result.artworks,
    total: result.total,
    limit: result.limit,
    offset: result.offset,
    hasMore: result.hasMore,
  };
};

export const action: ActionFunction = async ({ request }) => {
  if (request.method !== "POST") {
    return { error: "Method not allowed" };
  }

  const cookieHeader = request.headers.get("cookie");
  const token = getAuthTokenFromCookie(cookieHeader);
  const user = getUserFromToken(token);

  if (!user) {
    return { error: "Unauthorized" }, { status: 403 };
  }

  // Verify user is admin in database
  const { prismaClient } = await import("~/lib/db.server");
  const prisma = await prismaClient();
  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { role: true },
  });

  if (!dbUser || dbUser.role !== "ADMIN") {
    return { error: "Unauthorized" }, { status: 403 };
  }

  const formData = await request.formData();
  const artworkId = formData.get("artworkId") as string;

  if (!artworkId) {
    return { error: "Artwork ID is required" };
  }

  try {
    const { deleteArtwork } = await import("~/lib/artworks.server");
    
    await deleteArtwork(artworkId);
    
    return { success: true, deletedId: artworkId };
  } catch (error) {
    console.error("[ADMIN] Error deleting artwork:", error);
    return {
      error: error instanceof Error ? error.message : "Failed to delete artwork",
    };
  }
};

export default function AdminDashboard() {
  const data = useLoaderData<LoaderData>();
  const actionData = useActionData<ActionData>();
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [claimStatus, setClaimStatus] = useState(searchParams.get("claimStatus") || "ALL");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (claimStatus !== "ALL") params.set("claimStatus", claimStatus);
    params.set("page", "1");
    setSearchParams(params);
  };

  const handleFilterChange = (status: string) => {
    setClaimStatus(status);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (status !== "ALL") params.set("claimStatus", status);
    params.set("page", "1");
    setSearchParams(params);
  };

  const handleDeleteClick = (id: string) => {
    setConfirmDeleteId(id);
  };

  const handleConfirmDelete = (id: string) => {
    setDeletingId(id);
    const form = formRef.current;
    if (form) {
      const input = form.querySelector(`input[value="${id}"]`) as HTMLInputElement;
      if (input) {
        input.form?.submit();
      }
    }
  };

  const currentPage = parseInt(searchParams.get("page") || "1", 10);
  const totalPages = Math.ceil(data.total / data.limit);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "CLAIMED":
        return "bg-green-100 text-green-800";
      case "PENDING_APPROVAL":
        return "bg-yellow-100 text-yellow-800";
      case "UNCLAIMED":
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusLabel = (status: string) => {
    return status.replace(/_/g, " ");
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-8 py-6">
        <h1 className="text-3xl font-bold text-white">Admin Dashboard</h1>
        <p className="text-blue-100 mt-2">Manage artworks and pins</p>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto py-12 px-4">
        {/* Search & Filters */}
        <form onSubmit={handleSearch} className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label htmlFor="search" className="block text-sm font-medium text-gray-900 mb-2">
                Search by title or address
              </label>
              <input
                id="search"
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="e.g., Downtown Mural, Main St"
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label htmlFor="status" className="block text-sm font-medium text-gray-900 mb-2">
                Claim Status
              </label>
              <select
                id="status"
                value={claimStatus}
                onChange={(e) => handleFilterChange(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="ALL">All Statuses</option>
                <option value="UNCLAIMED">Unclaimed</option>
                <option value="PENDING_APPROVAL">Pending Approval</option>
                <option value="CLAIMED">Claimed</option>
              </select>
            </div>
          </div>

          <button
            type="submit"
            className="w-full md:w-auto bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 font-medium"
          >
            Search
          </button>
        </form>

        {/* Stats */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <p className="text-gray-700">
            Showing <span className="font-semibold">{data.offset + 1}</span> to{" "}
            <span className="font-semibold">{Math.min(data.offset + data.limit, data.total)}</span> of{" "}
            <span className="font-semibold">{data.total}</span> pins
          </p>
        </div>

        {/* Success Message */}
        {actionData?.success && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <p className="text-green-800 font-medium">Pin deleted successfully</p>
          </div>
        )}

        {/* Error Message */}
        {actionData?.error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800 font-medium">{actionData.error}</p>
          </div>
        )}

        {/* Artworks Grid */}
        {data.artworks.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <p className="text-gray-600 text-lg">No pins found</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {data.artworks.map((artwork) => (
                <div key={artwork.id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
                  {/* Image */}
                  {artwork.photos.length > 0 && (
                    <img
                      src={artwork.photos[0].photoUrl}
                      alt={artwork.title}
                      className="w-full h-48 object-cover"
                    />
                  )}

                  {/* Content */}
                  <div className="p-4">
                    <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">{artwork.title}</h3>

                    {artwork.address && (
                      <p className="text-sm text-gray-600 mb-3">📍 {artwork.address}</p>
                    )}

                    {/* Status Badge */}
                    <div className="mb-3">
                      <span className={`text-xs font-medium px-3 py-1 rounded-full ${getStatusColor(artwork.claimStatus)}`}>
                        {getStatusLabel(artwork.claimStatus)}
                      </span>
                    </div>

                    {/* Meta Info */}
                    <div className="text-xs text-gray-500 space-y-1 mb-4">
                      <p>Pinned by: <span className="font-medium">{artwork.createdBy.name}</span></p>
                      {artwork.artist && (
                        <p>Artist: <span className="font-medium">{artwork.artist.name}</span></p>
                      )}
                      <p>Created: {new Date(artwork.createdAt).toLocaleDateString()}</p>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      <a
                        href={`/artwork/${artwork.id}`}
                        className="flex-1 text-center bg-blue-600 text-white px-3 py-2 rounded-md hover:bg-blue-700 text-sm font-medium"
                      >
                        View
                      </a>
                      <button
                        onClick={() => handleDeleteClick(artwork.id)}
                        className="flex-1 bg-red-600 text-white px-3 py-2 rounded-md hover:bg-red-700 text-sm font-medium"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mb-8">
                {currentPage > 1 && (
                  <a
                    href={`?search=${search}&claimStatus=${claimStatus}&page=${currentPage - 1}`}
                    className="px-4 py-2 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    Previous
                  </a>
                )}

                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <a
                    key={page}
                    href={`?search=${search}&claimStatus=${claimStatus}&page=${page}`}
                    className={`px-4 py-2 rounded-md ${
                      currentPage === page
                        ? "bg-blue-600 text-white"
                        : "bg-white border border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    {page}
                  </a>
                ))}

                {currentPage < totalPages && (
                  <a
                    href={`?search=${search}&claimStatus=${claimStatus}&page=${currentPage + 1}`}
                    className="px-4 py-2 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    Next
                  </a>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {confirmDeleteId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-lg max-w-sm w-full overflow-hidden">
            <div className="bg-red-50 border-b border-red-200 px-6 py-4">
              <h3 className="text-lg font-semibold text-red-900 flex items-center gap-2">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                Delete Pin
              </h3>
            </div>

            <div className="p-6">
              <p className="text-gray-700 mb-2">
                Are you sure you want to delete this pin?
              </p>
              <p className="text-sm text-gray-600 mb-6">
                The associated photos will be orphaned and can be reassigned to another artwork later.
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmDeleteId(null)}
                  className="flex-1 border border-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-50 font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleConfirmDelete(confirmDeleteId)}
                  disabled={deletingId === confirmDeleteId}
                  className="flex-1 bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 font-medium disabled:opacity-50"
                >
                  {deletingId === confirmDeleteId ? "Deleting..." : "Delete"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Hidden Form for Deletion */}
      <form ref={formRef} method="POST" className="hidden">
        {confirmDeleteId && (
          <input type="hidden" name="artworkId" value={confirmDeleteId} />
        )}
      </form>
    </div>
  );
}
