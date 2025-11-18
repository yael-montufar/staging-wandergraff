import { prisma } from "./db.server";

export async function saveArtwork(userId: string, artworkId: string) {
  return prisma.save.create({
    data: {
      userId,
      artworkId,
    },
  });
}

export async function unsaveArtwork(userId: string, artworkId: string) {
  return prisma.save.delete({
    where: {
      userId_artworkId: {
        userId,
        artworkId,
      },
    },
  });
}

export async function isArtworkSaved(userId: string, artworkId: string) {
  const save = await prisma.save.findUnique({
    where: {
      userId_artworkId: {
        userId,
        artworkId,
      },
    },
  });
  return !!save;
}

export async function getUserSavedArtworks(userId: string) {
  const saves = await prisma.save.findMany({
    where: { userId },
    include: {
      artwork: {
        include: {
          artist: {
            select: {
              id: true,
              name: true,
            },
          },
          galleries: {
            where: { type: "DEFAULT" },
            include: {
              photos: {
                include: {
                  photo: true,
                },
                take: 1,
              },
            },
          },
        },
      },
    },
    orderBy: {
      savedAt: "desc",
    },
  });

  return saves.map((save) => save.artwork);
}

export async function getSaveCount(artworkId: string) {
  return prisma.save.count({
    where: { artworkId },
  });
}

export async function getTopSavedArtworks(limit = 20) {
  // Get top saved artworks - need to count and sort in memory
  const allArtworks = await prisma.artwork.findMany({
    include: {
      _count: {
        select: { saves: true },
      },
    },
  });

  return allArtworks
    .sort((a, b) => b._count.saves - a._count.saves)
    .slice(0, limit);
}
