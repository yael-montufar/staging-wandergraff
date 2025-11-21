// Prisma client initialization - deferred to avoid SSR issues
// Import lazily when actually needed

let prisma: any = null;

export async function prismaClient() {
  if (prisma) return prisma;

  try {
    // Import from .prisma/client per prisma/schema.prisma config
    // In dev: relative path works (app/lib -> project root -> .prisma/client)
    // In prod: Node resolves @prisma/client through package exports
    const { PrismaClient } = await import("@prisma/client");
    prisma = new PrismaClient();
    return prisma;
  } catch (error) {
    console.error("Failed to initialize Prisma client:", error);
    throw error;
  }
}
