import { type LoaderFunction } from "react-router";
import { prismaClient } from "~/lib/db.server";

export const loader: LoaderFunction = async ({ request }) => {
  try {
    const url = new URL(request.url);
    const year = url.searchParams.get("year");

    if (!year || isNaN(Number(year))) {
      return new Response(JSON.stringify([]), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const db = await prismaClient();
    const artworks = await db.artwork.findMany({
      where: {
        yearCreated: Number(year),
        claimStatus: "CLAIMED",
      },
      include: {
        artist: true,
        photos: {
          take: 1,
          orderBy: {
            uploadedAt: "desc",
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return new Response(JSON.stringify(artworks), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error fetching artworks by year:", error);
    return new Response(JSON.stringify([]), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
