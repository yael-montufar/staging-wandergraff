// Prisma client initialization - deferred to avoid SSR issues
// Import lazily when actually needed

export async function prismaClient() {
  const { PrismaClient } = await import("../../generated/prisma");

  let globalWithPrisma = global as typeof globalThis & {
    prisma: any;
  };

  if (!globalWithPrisma.prisma) {
    globalWithPrisma.prisma = new PrismaClient();
  }

  return globalWithPrisma.prisma;
}
