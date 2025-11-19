import { type LoaderFunction } from "react-router";
import { prismaClient } from "~/lib/db.server";

export const loader: LoaderFunction = async ({ request }) => {
  try {
    const url = new URL(request.url);
    const countryId = url.searchParams.get("countryId");

    if (!countryId) {
      return new Response(JSON.stringify(null), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const db = await prismaClient();
    const country = await db.country.findUnique({
      where: { id: countryId },
    });

    if (!country) {
      return new Response(JSON.stringify(null), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify(country), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error fetching country:", error);
    return new Response(JSON.stringify(null), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
