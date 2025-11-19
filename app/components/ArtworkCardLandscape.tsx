import { AddToWallButton } from "./AddToWallButton";

export interface ArtworkCardLandscapeProps {
  id: string;
  title: string;
  imageUrl?: string;
  artistName?: string;
  claimStatus?: "UNCLAIMED" | "PENDING_APPROVAL" | "CLAIMED";
  artworkArtistId?: string | null;
  currentUserId?: string;
  currentUser?: any;
  photoCount?: number;
  onClick?: () => void;
}

export function ArtworkCardLandscape({
  id,
  title,
  imageUrl,
  artistName,
  claimStatus,
  artworkArtistId,
  currentUserId,
  currentUser,
  photoCount = 0,
  onClick,
}: ArtworkCardLandscapeProps) {
  const isClaimMaker = currentUserId === artworkArtistId && claimStatus === "PENDING_APPROVAL";
  const displayStatus = isClaimMaker ? claimStatus : (claimStatus === "PENDING_APPROVAL" ? "UNCLAIMED" : claimStatus);

  const statusLabel = {
    UNCLAIMED: "Unclaimed",
    PENDING_APPROVAL: "Pending",
    CLAIMED: "Claimed",
  }[displayStatus || "UNCLAIMED"];

  const statusColor = {
    UNCLAIMED: "bg-gray-100/80 text-gray-800",
    PENDING_APPROVAL: "bg-yellow-100/80 text-yellow-800",
    CLAIMED: "bg-green-100/80 text-green-800",
  }[displayStatus || "UNCLAIMED"];

  return (
    <div
      onClick={onClick}
      className="relative aspect-video bg-gray-200 overflow-hidden rounded-lg group cursor-pointer"
    >
      {/* Image */}
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-gray-300">
          <span className="text-gray-500 text-sm">No image</span>
        </div>
      )}

      {/* Content Overlay - Bottom left */}
      <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/70 via-black/40 to-transparent">
        <h3 className="font-bold text-lg text-white line-clamp-2 mb-2">
          {title}
        </h3>

        {artistName && displayStatus === "CLAIMED" && (
          <p className="text-sm text-gray-100 mb-2">by {artistName}</p>
        )}

        {/* Status and photo count */}
        <div className="flex items-center gap-2">
          <span className={`text-xs font-medium px-2 py-1 rounded backdrop-blur-sm ${statusColor}`}>
            {statusLabel}
          </span>
          {photoCount > 0 && (
            <span className="text-xs text-gray-200">
              {photoCount} {photoCount === 1 ? "photo" : "photos"}
            </span>
          )}
        </div>
      </div>

      {/* Add to Wall Button - Top right corner */}
      {currentUser && (
        <div
          className="absolute top-2 right-2"
          onClick={(e) => e.stopPropagation()}
        >
          <AddToWallButton
            artworkId={id}
            artworkTitle={title}
            variant="icon-brick"
          />
        </div>
      )}
    </div>
  );
}
