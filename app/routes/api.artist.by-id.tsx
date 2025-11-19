import { type LoaderFunction } from "react-router";
import { prismaClient } from "~/lib/db.server";

export const loader: LoaderFunction = async ({ request }) => {
  try {
    const url = new URL(request.url);
    const artistId = url.searchParams.get("artistId");

    if (!artistId) {
      return new Response(JSON.stringify(null), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const db = await prismaClient();
    const artist = await db.artist.findUnique({
      where: { id: artistId },
    });

    if (!artist) {
      return new Response(JSON.stringify(null), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify(artist), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error fetching artist:", error);
    return new Response(JSON.stringify(null), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
