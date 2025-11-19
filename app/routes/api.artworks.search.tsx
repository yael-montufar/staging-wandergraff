import type { Route } from "./+types/api.artworks.search";

// Simple fuzzy match algorithm - gives higher score for matches at start of string
function fuzzyMatch(query: string, text: string): number {
  const q = query.toLowerCase();
  const t = text.toLowerCase();

  // Exact substring match (highest priority)
  if (t.includes(q)) {
    const index = t.indexOf(q);
    // Prefer matches at the beginning of the string
    return 100 - index;
  }

  // Fuzzy match: check if all characters in query appear in order in text
  let queryIdx = 0;
  let textIdx = 0;
  let score = 0;

  while (queryIdx < q.length && textIdx < t.length) {
    if (q[queryIdx] === t[textIdx]) {
      queryIdx++;
      score += 1;
    }
    textIdx++;
  }

  // Return 0 if not all characters were matched
  return queryIdx === q.length ? score : 0;
}

export const loader: Route.LoaderFunction = async ({ request }) => {
  try {
    const { prismaClient } = await import("~/lib/db.server");

    const url = new URL(request.url);
    const query = url.searchParams.get("q") || "";

    if (!query || query.trim().length < 2) {
      return new Response(JSON.stringify({ artworks: [] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    const prisma = await prismaClient();

    // Fetch all artworks with related data
    const allArtworks = await prisma.artwork.findMany({
      select: {
        id: true,
        title: true,
        description: true,
        address: true,
        yearCreated: true,
        claimStatus: true,
        artist: {
          select: {
            artistName: true,
          },
        },
        createdBy: {
          select: {
            name: true,
          },
        },
        photos: {
          where: { isPrivate: false },
          take: 1,
          select: {
            photoUrl: true,
          },
        },
      },
      take: 100, // Reasonable limit to avoid fetching too much
    });

    // Perform fuzzy matching and scoring
    const scoredArtworks = allArtworks
      .map((artwork) => {
        const searchableText = [
          artwork.title,
          artwork.description || "",
          artwork.address || "",
          artwork.yearCreated?.toString() || "",
          artwork.artist?.artistName || artwork.createdBy?.name || "",
        ].join(" ");

        // Score the combined searchable text
        const score = fuzzyMatch(query, searchableText);

        // Also boost if title matches exactly
        const titleScore = fuzzyMatch(query, artwork.title);

        return {
          ...artwork,
          score: titleScore > 0 ? score + 20 : score,
        };
      })
      .filter((artwork) => artwork.score > 0) // Only include matches
      .sort((a, b) => b.score - a.score) // Sort by relevance
      .slice(0, 20) // Return top 20 results
      .map(({ score, ...artwork }) => ({
        ...artwork,
        artistName: artwork.artist?.artistName || artwork.createdBy?.name,
        photoUrl: artwork.photos[0]?.photoUrl,
      })); // Map to cleaner structure

    return new Response(JSON.stringify({ artworks: scoredArtworks }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[ARTWORKS_SEARCH] Error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Search failed",
        artworks: [],
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};
