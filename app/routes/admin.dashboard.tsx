import { type LoaderFunction, type ActionFunction, redirect, useLoaderData, useActionData, useSearchParams, useRouteLoaderData } from "react-router";
import { useState, useRef } from "react";
import { getAuthTokenFromCookie, getUserFromToken } from "~/lib/auth.server";
import { Header } from "~/components/Header";
import { useTheme } from "~/lib/useTheme";

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
  artists: Array<{
    id: string;
    email: string;
    name: string;
    artistName?: string;
    artistEmail?: string;
    artistInstagram?: string;
    artistTwitter?: string;
    artistWebsite?: string;
    artistBio?: string;
  }>;
};

type ActionData = {
  error?: string;
  success?: boolean;
  deletedId?: string;
  claimApproved?: string;
  claimRejected?: string;
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

  const artworksResult = await getAllArtworks({
    search: search || undefined,
    claimStatus: claimStatus === "ALL" ? undefined : claimStatus,
    limit,
    offset,
  });

  // Fetch all artists with their contact info
  const artists = await prisma.user.findMany({
    where: { role: "ARTIST" },
    select: {
      id: true,
      email: true,
      name: true,
      artistName: true,
      artistEmail: true,
      artistInstagram: true,
      artistTwitter: true,
      artistWebsite: true,
      artistBio: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return {
    artworks: artworksResult.artworks,
    total: artworksResult.total,
    limit: artworksResult.limit,
    offset: artworksResult.offset,
    hasMore: artworksResult.hasMore,
    artists,
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
  const intent = formData.get("intent") as string;
  const artworkId = formData.get("artworkId") as string;

  if (!artworkId) {
    return { error: "Artwork ID is required" };
  }

  try {
    if (intent === "delete-artwork") {
      const { deleteArtwork } = await import("~/lib/artworks.server");
      await deleteArtwork(artworkId);
      return { success: true, deletedId: artworkId };
    }

    if (intent === "approve-claim") {
      const { approveClaim, getArtwork } = await import("~/lib/artworks.server");

      const artwork = await getArtwork(artworkId);
      if (!artwork) {
        return { error: "Artwork not found" };
      }

      if (artwork.claimStatus !== "PENDING_APPROVAL") {
        return { error: "This claim is not pending approval" };
      }

      if (!artwork.artistId) {
        return { error: "No artist associated with this claim" };
      }

      // Approve the claim
      await approveClaim(artworkId);

      return { success: true, claimApproved: artworkId };
    }

    if (intent === "reject-claim") {
      const { rejectClaim } = await import("~/lib/artworks.server");
      await rejectClaim(artworkId);
      return { success: true, claimRejected: artworkId };
    }


    return { error: "Unknown intent" };
  } catch (error) {
    console.error("[ADMIN] Error:", error);
    return {
      error: error instanceof Error ? error.message : "An error occurred",
    };
  }
};

export default function AdminDashboard() {
  const rootData = useRouteLoaderData("root") as any;
  const data = useLoaderData<LoaderData>();
  const actionData = useActionData<ActionData>();
  const { scheme } = useTheme();
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [claimStatus, setClaimStatus] = useState(searchParams.get("claimStatus") || "ALL");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [confirmApproveId, setConfirmApproveId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [confirmRejectId, setConfirmRejectId] = useState<string | null>(null);
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
    setConfirmDeleteId(null);
    const form = formRef.current;
    if (form) {
      const intentInput = form.querySelector('input[name="intent"]') as HTMLInputElement;
      if (intentInput) intentInput.value = "delete-artwork";
      const idInput = form.querySelector('input[name="artworkId"]') as HTMLInputElement;
      if (idInput) idInput.value = id;
      form.submit();
    }
  };

  const handleApproveClick = (id: string) => {
    setConfirmApproveId(id);
  };

  const handleConfirmApprove = (id: string) => {
    setApprovingId(id);
    setConfirmApproveId(null);
    const form = formRef.current;
    if (form) {
      const intentInput = form.querySelector('input[name="intent"]') as HTMLInputElement;
      if (intentInput) intentInput.value = "approve-claim";
      const idInput = form.querySelector('input[name="artworkId"]') as HTMLInputElement;
      if (idInput) idInput.value = id;
      form.submit();
    }
  };

  const handleRejectClick = (id: string) => {
    setConfirmRejectId(id);
  };

  const handleConfirmReject = (id: string) => {
    setRejectingId(id);
    setConfirmRejectId(null);
    const form = formRef.current;
    if (form) {
      const intentInput = form.querySelector('input[name="intent"]') as HTMLInputElement;
      if (intentInput) intentInput.value = "reject-claim";
      const idInput = form.querySelector('input[name="artworkId"]') as HTMLInputElement;
      if (idInput) idInput.value = id;
      form.submit();
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
    <div className="min-h-screen" suppressHydrationWarning style={{ backgroundColor: scheme.primaryBg }}>
      <Header user={rootData?.user} />

      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-8 py-6">
        <h1 className="text-3xl font-bold text-white">Admin Dashboard</h1>
        <p className="text-blue-100 mt-2">Manage artworks and pins</p>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto py-12 px-4">
        {/* Artists Directory Section */}
        {data.artists && data.artists.length > 0 && (
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-8 mb-12">
            <h2 className="text-2xl font-bold text-purple-900 mb-6 flex items-center gap-2">
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
              </svg>
              Registered Artists ({data.artists.length})
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {data.artists.map((artist: any) => (
                <div key={artist.id} className="bg-white rounded-lg p-6 border border-purple-200">
                  <div className="mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {artist.artistName || artist.name}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {artist.email}
                    </p>
                  </div>

                  <div className="space-y-2 text-sm">
                    {artist.artistEmail && (
                      <div>
                        <p className="text-xs text-gray-600 font-semibold">Contact Email</p>
                        <a href={`mailto:${artist.artistEmail}`} className="text-blue-600 hover:text-blue-700">
                          {artist.artistEmail}
                        </a>
                      </div>
                    )}

                    {artist.artistInstagram && (
                      <div>
                        <p className="text-xs text-gray-600 font-semibold">Instagram</p>
                        <a
                          href={`https://instagram.com/${artist.artistInstagram}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-700"
                        >
                          @{artist.artistInstagram}
                        </a>
                      </div>
                    )}

                    {artist.artistTwitter && (
                      <div>
                        <p className="text-xs text-gray-600 font-semibold">Twitter</p>
                        <a
                          href={`https://twitter.com/${artist.artistTwitter}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-700"
                        >
                          @{artist.artistTwitter}
                        </a>
                      </div>
                    )}

                    {artist.artistWebsite && (
                      <div>
                        <p className="text-xs text-gray-600 font-semibold">Website</p>
                        <a
                          href={artist.artistWebsite}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-700 truncate"
                        >
                          {artist.artistWebsite}
                        </a>
                      </div>
                    )}

                    {artist.artistBio && (
                      <div>
                        <p className="text-xs text-gray-600 font-semibold">Bio</p>
                        <p className="text-sm text-gray-700 line-clamp-3">{artist.artistBio}</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

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

        {/* Success Messages */}
        {actionData?.deletedId && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <p className="text-green-800 font-medium">Pin deleted successfully</p>
          </div>
        )}
        {actionData?.claimApproved && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <p className="text-green-800 font-medium">Claim approved! Artist can now edit the artwork details.</p>
          </div>
        )}
        {actionData?.claimRejected && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <p className="text-green-800 font-medium">Claim rejected. Artwork returned to UNCLAIMED status.</p>
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
                    <div className="space-y-2">
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

                      {/* Claim Approval Buttons */}
                      {artwork.claimStatus === "PENDING_APPROVAL" && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleApproveClick(artwork.id)}
                            className="flex-1 bg-green-600 text-white px-3 py-2 rounded-md hover:bg-green-700 text-sm font-medium"
                          >
                            ✓ Approve
                          </button>
                          <button
                            onClick={() => handleRejectClick(artwork.id)}
                            className="flex-1 bg-orange-600 text-white px-3 py-2 rounded-md hover:bg-orange-700 text-sm font-medium"
                          >
                            ✕ Reject
                          </button>
                        </div>
                      )}
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

      {/* Approve Claim Confirmation Modal */}
      {confirmApproveId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-lg max-w-sm w-full overflow-hidden">
            <div className="bg-green-50 border-b border-green-200 px-6 py-4">
              <h3 className="text-lg font-semibold text-green-900 flex items-center gap-2">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Approve Claim
              </h3>
            </div>

            <div className="p-6">
              <p className="text-gray-700 mb-4">
                Are you sure you want to approve this claim?
              </p>
              <p className="text-sm text-gray-600 mb-6">
                The artist will be able to edit the artwork details (title, year, description).
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmApproveId(null)}
                  className="flex-1 border border-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-50 font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleConfirmApprove(confirmApproveId)}
                  disabled={approvingId === confirmApproveId}
                  className="flex-1 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 font-medium disabled:opacity-50"
                >
                  {approvingId === confirmApproveId ? "Approving..." : "Approve"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reject Claim Confirmation Modal */}
      {confirmRejectId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-lg max-w-sm w-full overflow-hidden">
            <div className="bg-orange-50 border-b border-orange-200 px-6 py-4">
              <h3 className="text-lg font-semibold text-orange-900 flex items-center gap-2">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M13.477 14.89A6 6 0 015.11 2.697m8.08 11.769A6.001 6.001 0 0012 4a6 6 0 00-8.477 10.889m10.954 4.268A7 7 0 105.11 3.707" clipRule="evenodd" />
                </svg>
                Reject Claim
              </h3>
            </div>

            <div className="p-6">
              <p className="text-gray-700 mb-4">
                Are you sure you want to reject this claim?
              </p>
              <p className="text-sm text-gray-600 mb-6">
                The artwork will return to UNCLAIMED status. The artist can submit a new claim later.
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmRejectId(null)}
                  className="flex-1 border border-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-50 font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleConfirmReject(confirmRejectId)}
                  disabled={rejectingId === confirmRejectId}
                  className="flex-1 bg-orange-600 text-white px-4 py-2 rounded-md hover:bg-orange-700 font-medium disabled:opacity-50"
                >
                  {rejectingId === confirmRejectId ? "Rejecting..." : "Reject"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}


      {/* Hidden Form for Actions */}
      <form ref={formRef} method="POST" className="hidden">
        <input type="hidden" name="intent" />
        <input type="hidden" name="artworkId" />
      </form>
    </div>
  );
}
