// Prisma client initialization - deferred to avoid SSR issues
// Import lazily when actually needed

let prisma: any = null;

export async function prismaClient() {
  if (prisma) return prisma;

  try {
    // Import from generated directory per prisma/schema.prisma config
    // From app/lib/db.server.ts, go up 2 levels to project root, then into generated/prisma/client
    const { PrismaClient } = await import("../../generated/prisma/client");
    prisma = new PrismaClient();
    return prisma;
  } catch (error) {
    console.error("Failed to initialize Prisma client:", error);
    throw error;
  }
}
