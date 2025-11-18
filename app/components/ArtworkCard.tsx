import { Card, CardBody } from "./ui/Card";
import { AddToWallButton } from "./AddToWallButton";

export interface ArtworkCardProps {
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

export function ArtworkCard({
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
}: ArtworkCardProps) {
  // Only show PENDING_APPROVAL to the user who made the claim
  const isClaimMaker = currentUserId === artworkArtistId && claimStatus === "PENDING_APPROVAL";
  const displayStatus = isClaimMaker ? claimStatus : (claimStatus === "PENDING_APPROVAL" ? "UNCLAIMED" : claimStatus);

  const statusLabel = {
    UNCLAIMED: "Unclaimed",
    PENDING_APPROVAL: "Pending",
    CLAIMED: "Claimed",
  }[displayStatus || "UNCLAIMED"];

  const statusColor = {
    UNCLAIMED: "bg-gray-100 text-gray-800",
    PENDING_APPROVAL: "bg-yellow-100 text-yellow-800",
    CLAIMED: "bg-green-100 text-green-800",
  }[displayStatus || "UNCLAIMED"];

  return (
    <Card
      clickable
      onClick={onClick}
      className="overflow-hidden group h-full flex flex-col relative"
    >
      {/* Image Container */}
      <div className="aspect-square bg-gray-200 overflow-hidden relative">
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

        {/* Add to Wall Button - Bottom right corner */}
        {currentUser && (
          <div
            className="absolute bottom-2 right-2"
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

      {/* Content */}
      <CardBody className="flex-1 flex flex-col">
        <h3 className="font-semibold text-lg text-gray-900 line-clamp-2">
          {title}
        </h3>

        {/* Only show artist name if artwork is claimed by a verified artist */}
        {artistName && displayStatus === "CLAIMED" && (
          <p className="text-sm text-gray-600 mt-1">by {artistName}</p>
        )}

        {/* Status Badge */}
        <div className="mt-2 flex items-center gap-2">
          <span className={`text-xs font-medium px-2 py-1 rounded ${statusColor}`}>
            {statusLabel}
          </span>
          {photoCount > 0 && (
            <span className="text-xs text-gray-500">
              {photoCount} {photoCount === 1 ? "photo" : "photos"}
            </span>
          )}
        </div>
      </CardBody>
    </Card>
  );
}
