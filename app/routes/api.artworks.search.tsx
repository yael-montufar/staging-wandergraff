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

    // Fetch all artworks (we'll do fuzzy filtering in JS for better control)
    const allArtworks = await prisma.artwork.findMany({
      select: {
        id: true,
        title: true,
        description: true,
        claimStatus: true,
      },
      take: 100, // Reasonable limit to avoid fetching too much
    });

    // Perform fuzzy matching and scoring
    const scoredArtworks = allArtworks
      .map((artwork) => {
        // Score both title and description
        const titleScore = fuzzyMatch(query, artwork.title);
        const descriptionScore = fuzzyMatch(
          query,
          artwork.description || ""
        );

        // Use the higher score, but boost title matches
        const score =
          Math.max(titleScore, descriptionScore) +
          (titleScore > descriptionScore ? 10 : 0);

        return { ...artwork, score };
      })
      .filter((artwork) => artwork.score > 0) // Only include matches
      .sort((a, b) => b.score - a.score) // Sort by relevance
      .slice(0, 20) // Return top 20 results
      .map(({ score, ...artwork }) => artwork); // Remove score from result

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
