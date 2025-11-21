import { type LoaderFunction } from "react-router";
import { prismaClient } from "~/lib/db.server";

export const loader: LoaderFunction = async ({ request }) => {
  try {
    const url = new URL(request.url);
    const countryId = url.searchParams.get("countryId");

    if (!countryId) {
      return new Response(JSON.stringify([]), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const db = await prismaClient();

    // Get the country name from Country table
    const country = await db.country.findUnique({
      where: { id: countryId },
    });

    if (!country) {
      return new Response(JSON.stringify([]), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Find all artworks (claimed and unclaimed) with this country
    const artworks = await db.artwork.findMany({
      where: {
        countryId: countryId,
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
    console.error("Error fetching artworks by country:", error);
    return new Response(JSON.stringify([]), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
