import { type ActionFunction } from "react-router";

export const action: ActionFunction = async ({ request }) => {
  if (request.method !== "POST") {
    return { error: "Method not allowed" };
  }

  try {
    const { latitude, longitude } = await request.json();

    if (typeof latitude !== "number" || typeof longitude !== "number") {
      return Response.json({ error: "Invalid coordinates" }, { status: 400 });
    }

    const { findDuplicateArtworkNearby } = await import("~/lib/artworks.server");

    const artwork = await findDuplicateArtworkNearby(latitude, longitude);

    if (artwork) {
      return Response.json({
        found: true,
        artwork: {
          id: artwork.id,
          title: artwork.title,
          address: artwork.address,
          claimStatus: artwork.claimStatus,
          artistId: artwork.artistId,
          artistName: artwork.artist?.name,
          photos: artwork.photos?.map((p) => ({ photoUrl: p.photoUrl })) || [],
        },
      });
    }

    return Response.json({
      found: false,
    });
  } catch (error) {
    console.error("[CHECK-LOCATION] Error:", error);
    return Response.json({ error: "Server error" }, { status: 500 });
  }
};
