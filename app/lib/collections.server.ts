import { prisma } from "./db.server";

export async function createCollection(
  userId: string,
  name: string,
  options?: {
    description?: string;
    isPublic?: boolean;
  }
) {
  return prisma.collection.create({
    data: {
      userId,
      name,
      description: options?.description,
      isPublic: options?.isPublic ?? false,
    },
  });
}

export async function getCollection(id: string) {
  return prisma.collection.findUnique({
    where: { id },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          avatarUrl: true,
        },
      },
      items: {
        include: {
          artwork: {
            include: {
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
          addedAt: "desc",
        },
      },
    },
  });
}

export async function updateCollection(
  id: string,
  data: {
    name?: string;
    description?: string;
    isPublic?: boolean;
  }
) {
  return prisma.collection.update({
    where: { id },
    data,
  });
}

export async function deleteCollection(id: string) {
  return prisma.collection.delete({
    where: { id },
  });
}

export async function addArtworkToCollection(
  collectionId: string,
  artworkId: string
) {
  return prisma.collectionItem.create({
    data: {
      collectionId,
      artworkId,
    },
  });
}

export async function removeArtworkFromCollection(
  collectionId: string,
  artworkId: string
) {
  return prisma.collectionItem.delete({
    where: {
      collectionId_artworkId: {
        collectionId,
        artworkId,
      },
    },
  });
}

export async function isArtworkInCollection(
  collectionId: string,
  artworkId: string
) {
  const item = await prisma.collectionItem.findUnique({
    where: {
      collectionId_artworkId: {
        collectionId,
        artworkId,
      },
    },
  });
  return !!item;
}

export async function getUserCollections(userId: string) {
  return prisma.collection.findMany({
    where: { userId },
    include: {
      items: {
        select: {
          artwork: {
            select: {
              id: true,
              title: true,
            },
          },
        },
      },
      _count: {
        select: { items: true },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });
}

export async function getPublicCollections(limit = 50) {
  return prisma.collection.findMany({
    where: { isPublic: true },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          avatarUrl: true,
        },
      },
      items: {
        take: 4,
        include: {
          artwork: {
            select: {
              id: true,
              title: true,
            },
          },
        },
      },
      _count: {
        select: { items: true },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    take: limit,
  });
}

export async function searchCollections(query: string, limit = 20) {
  return prisma.collection.findMany({
    where: {
      isPublic: true,
      OR: [
        { name: { contains: query, mode: "insensitive" } },
        { description: { contains: query, mode: "insensitive" } },
      ],
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          avatarUrl: true,
        },
      },
      _count: {
        select: { items: true },
      },
    },
    take: limit,
  });
}

export async function getCollectionArtworkCount(collectionId: string) {
  return prisma.collectionItem.count({
    where: { collectionId },
  });
}
