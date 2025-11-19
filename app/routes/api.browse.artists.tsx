import { type LoaderFunction } from "react-router";
import { prismaClient } from "~/lib/db.server";

interface ArtistsByLetter {
  [letter: string]: Array<{
    id: string;
    name: string;
    artworkCount: number;
  }>;
}

export const loader: LoaderFunction = async () => {
  try {
    const db = await prismaClient();
    const artists = await db.artist.findMany({
      orderBy: [
        { artworkCount: "desc" },
        { name: "asc" },
      ],
    });

    // Group artists by first letter
    const grouped: ArtistsByLetter = {};

    for (const artist of artists) {
      const firstLetter = (artist.name.charAt(0) || "").toUpperCase();
      if (!grouped[firstLetter]) {
        grouped[firstLetter] = [];
      }
      grouped[firstLetter].push(artist);
    }

    return new Response(JSON.stringify(grouped), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error fetching artists:", error);
    return new Response(JSON.stringify({}), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
