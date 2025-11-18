import { type ActionFunction } from "react-router";
import { prismaClient } from "~/lib/db.server";

function json(data: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(data), {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
}

type CreateUserPayload = {
  id: string;
  email: string;
  name: string;
};

export const action: ActionFunction = async ({ request }) => {
  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, { status: 405 });
  }

  try {
    const payload = await request.json() as CreateUserPayload;

    console.log("[API] Creating user:", payload);

    const { id, email, name } = payload;

    if (!id || !email) {
      return json(
        { error: "Missing required fields: id, email" },
        { status: 400 }
      );
    }

    const prisma = await prismaClient();

    // Use Supabase user ID as the primary key
    const dbUser = await prisma.user.upsert({
      where: { id },
      update: {
        email,
        name: name || email,
      },
      create: {
        id,
        email,
        name: name || email,
        role: "REGULAR_USER",
      },
    });

    console.log("[API] ✓ User created/updated:", { id: dbUser.id, email: dbUser.email });

    return json({ success: true, user: { id: dbUser.id, email: dbUser.email } });
  } catch (error) {
    console.error("[API] ✗ Error creating user:", error);
    if (error instanceof Error) {
      console.error("[API] Error message:", error.message);
    }
    return json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
};
