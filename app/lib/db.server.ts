import { PrismaClient } from "@prisma/client";

let prismaInstance: PrismaClient | null = null;

function getPrismaClient(): PrismaClient {
  if (prismaInstance) return prismaInstance;

  prismaInstance = new PrismaClient();

  // Handle cleanup on process exit
  if (typeof process !== "undefined") {
    process.on("exit", () => {
      prismaInstance?.$disconnect();
    });
  }

  return prismaInstance;
}

export async function prismaClient(): Promise<PrismaClient> {
  return getPrismaClient();
}
