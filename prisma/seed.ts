import { config } from "dotenv";
import { resolve } from "path";

// Load .env file
config({ path: resolve(process.cwd(), ".env") });

import { prismaClient } from "../app/lib/db.server";
import fs from "fs";
import path from "path";

// Locations with real coordinates from different cities for street art
const locations = [
  // Buenos Aires, Argentina
  { lat: -34.6037, lon: -58.3816, city: "Buenos Aires", country: "Argentina" },
  { lat: -34.6046, lon: -58.3815, city: "Buenos Aires", country: "Argentina" },
  { lat: -34.6048, lon: -58.3812, city: "Buenos Aires", country: "Argentina" },
  // Los Angeles, USA
  { lat: 34.1028, lon: -118.2671, city: "Los Angeles", country: "United States" },
  { lat: 34.1025, lon: -118.2668, city: "Los Angeles", country: "United States" },
  // Berlin, Germany
  { lat: 52.5170, lon: 13.3888, city: "Berlin", country: "Germany" },
  { lat: 52.5175, lon: 13.3891, city: "Berlin", country: "Germany" },
  // Melbourne, Australia
  { lat: -37.8136, lon: 144.9631, city: "Melbourne", country: "Australia" },
  { lat: -37.8140, lon: 144.9635, city: "Melbourne", country: "Australia" },
  // São Paulo, Brazil
  { lat: -23.5505, lon: -46.6333, city: "São Paulo", country: "Brazil" },
  { lat: -23.5510, lon: -46.6330, city: "São Paulo", country: "Brazil" },
  // Miami, USA
  { lat: 25.7617, lon: -80.1918, city: "Miami", country: "United States" },
  { lat: 25.7620, lon: -80.1920, city: "Miami", country: "United States" },
  // London, UK
  { lat: 51.5074, lon: -0.1278, city: "London", country: "United Kingdom" },
  { lat: 51.5080, lon: -0.1280, city: "London", country: "United Kingdom" },
  // Tokyo, Japan
  { lat: 35.6762, lon: 139.7674, city: "Tokyo", country: "Japan" },
  { lat: 35.6765, lon: 139.7680, city: "Tokyo", country: "Japan" },
  // Mexico City, Mexico
  { lat: 19.4326, lon: -99.1332, city: "Mexico City", country: "Mexico" },
  { lat: 19.4330, lon: -99.1335, city: "Mexico City", country: "Mexico" },
  // New York, USA
  { lat: 40.7128, lon: -74.0060, city: "New York", country: "United States" },
  { lat: 40.7135, lon: -74.0065, city: "New York", country: "United States" },
  // Paris, France
  { lat: 48.8566, lon: 2.3522, city: "Paris", country: "France" },
  { lat: 48.8570, lon: 2.3525, city: "Paris", country: "France" },
  // Barcelona, Spain
  { lat: 41.3851, lon: 2.1734, city: "Barcelona", country: "Spain" },
  { lat: 41.3855, lon: 2.1738, city: "Barcelona", country: "Spain" },
];

interface Location {
  lat: number;
  lon: number;
  city: string;
  country: string;
}

async function getAvailableImages(): Promise<string[]> {
  const uploadsDir = path.join(process.cwd(), "public", "uploads");
  try {
    const files = fs.readdirSync(uploadsDir).filter((f) => f.endsWith(".jpg"));
    return files.map((f) => `/uploads/${f}`);
  } catch (error) {
    console.error("Error reading uploads directory:", error);
    return [];
  }
}

function getRandomItems<T>(arr: T[], count: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

function getRandomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function seed() {
  const prisma = await prismaClient();

  console.log("🌱 Starting database seed...");

  // Get available images
  const availableImages = await getAvailableImages();
  console.log(`📷 Found ${availableImages.length} images in uploads folder`);

  if (availableImages.length === 0) {
    console.error("❌ No images found in public/uploads. Aborting seed.");
    return;
  }

  // Clear existing data (preserve order for FK constraints)
  console.log("🗑️ Clearing existing data...");
  await prisma.collectionItem.deleteMany({});
  await prisma.follow.deleteMany({});
  await prisma.save.deleteMany({});
  await prisma.galleryPhoto.deleteMany({});
  await prisma.gallery.deleteMany({});
  await prisma.photo.deleteMany({});
  await prisma.collection.deleteMany({});
  await prisma.artwork.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.artist.deleteMany({});
  await prisma.country.deleteMany({});
  await prisma.artworkYear.deleteMany({});

  // Create users with various roles and activity levels
  console.log("👥 Creating users...");

  const admin = await prisma.user.create({
    data: {
      email: "admin@wandergraff.local",
      name: "Admin User",
      role: "ADMIN",
      bio: "Platform administrator",
    },
  });
  console.log(`✓ Admin: ${admin.email}`);

  // Regular users (no activity)
  const regularUser1 = await prisma.user.create({
    data: {
      email: "explorer1@wandergraff.local",
      name: "Alex Chen",
      role: "REGULAR_USER",
      bio: "Street art enthusiast",
    },
  });

  const regularUser2 = await prisma.user.create({
    data: {
      email: "explorer2@wandergraff.local",
      name: "Jordan Smith",
      role: "REGULAR_USER",
      bio: "Photography lover",
    },
  });

  const regularUser3 = await prisma.user.create({
    data: {
      email: "explorer3@wandergraff.local",
      name: "Taylor Johnson",
      role: "REGULAR_USER",
    },
  });

  console.log(`✓ Regular users: ${regularUser1.email}, ${regularUser2.email}, ${regularUser3.email}`);

  // Regular users with photo activity only (no claims)
  const regularPhotographer1 = await prisma.user.create({
    data: {
      email: "photographer1@wandergraff.local",
      name: "Casey Williams",
      role: "REGULAR_USER",
      bio: "Amateur photographer",
    },
  });

  const regularPhotographer2 = await prisma.user.create({
    data: {
      email: "photographer2@wandergraff.local",
      name: "Morgan Davis",
      role: "REGULAR_USER",
      bio: "Urban explorer with camera",
    },
  });

  console.log(
    `✓ Photographer users: ${regularPhotographer1.email}, ${regularPhotographer2.email}`
  );

  // Artists with no claims (just registered)
  const artistNoActivity1 = await prisma.user.create({
    data: {
      email: "artist.silent1@wandergraff.local",
      name: "Pat Anderson",
      role: "ARTIST",
      artistName: "Pat Anderson",
      artistBio: "Emerging street artist",
      artistInstagram: "@patandersonart",
    },
  });

  const artistNoActivity2 = await prisma.user.create({
    data: {
      email: "artist.silent2@wandergraff.local",
      name: "Riley Cooper",
      role: "ARTIST",
      artistName: "Riley Cooper",
      artistBio: "Abstract muralist",
      artistWebsite: "https://rileycooper.art",
    },
  });

  console.log(
    `✓ Artist (no activity): ${artistNoActivity1.email}, ${artistNoActivity2.email}`
  );

  // Artists with pending claims
  const artistPending1 = await prisma.user.create({
    data: {
      email: "artist.pending1@wandergraff.local",
      name: "Sage Taylor",
      role: "ARTIST",
      artistName: "Sage Taylor",
      artistBio: "Vibrant muralist",
      artistEmail: "sage@wandergraff.local",
    },
  });

  const artistPending2 = await prisma.user.create({
    data: {
      email: "artist.pending2@wandergraff.local",
      name: "Blake Martinez",
      role: "ARTIST",
      artistName: "Blake Martinez",
      artistBio: "Experimental artist",
      artistTwitter: "@blakemartinez",
    },
  });

  console.log(
    `✓ Artist (pending claims): ${artistPending1.email}, ${artistPending2.email}`
  );

  // Artists with approved claims (active)
  const artistActive1 = await prisma.user.create({
    data: {
      email: "artist.active1@wandergraff.local",
      name: "Jordan Blake",
      role: "ARTIST",
      artistName: "Jordan Blake",
      artistBio: "Contemporary street artist",
      artistInstagram: "@jordanblakeart",
      artistWebsite: "https://jordanblake.com",
    },
  });

  const artistActive2 = await prisma.user.create({
    data: {
      email: "artist.active2@wandergraff.local",
      name: "Sam Rivera",
      role: "ARTIST",
      artistName: "Sam Rivera",
      artistBio: "Muralist and illustrator",
      artistEmail: "sam@samrivera.art",
    },
  });

  const artistActive3 = await prisma.user.create({
    data: {
      email: "artist.active3@wandergraff.local",
      name: "Casey Huang",
      role: "ARTIST",
      artistName: "Casey Huang",
      artistBio: "Street art pioneer",
    },
  });

  console.log(
    `✓ Artist (active): ${artistActive1.email}, ${artistActive2.email}, ${artistActive3.email}`
  );

  // Artists with full activity (claimed + photos + collections)
  const artistFull1 = await prisma.user.create({
    data: {
      email: "artist.full1@wandergraff.local",
      name: "Yael Montufar",
      role: "ARTIST",
      artistName: "Yael Montufar",
      artistBio: "Legendary street artist",
      artistInstagram: "@yaelmontufar",
      artistEmail: "yael@wandergraff.local",
      artistWebsite: "https://yaelmontufar.art",
    },
  });

  const artistFull2 = await prisma.user.create({
    data: {
      email: "artist.full2@wandergraff.local",
      name: "Lucia Romero",
      role: "ARTIST",
      artistName: "Lucia Romero",
      artistBio: "Colorful muralist",
      artistInstagram: "@luciaromerart",
    },
  });

  console.log(
    `✓ Artist (full activity): ${artistFull1.email}, ${artistFull2.email}`
  );

  const allArtists = [
    artistNoActivity1,
    artistNoActivity2,
    artistPending1,
    artistPending2,
    artistActive1,
    artistActive2,
    artistActive3,
    artistFull1,
    artistFull2,
  ];

  // Create artworks
  console.log("🎨 Creating artworks...");
  let imageIndex = 0;

  const artworks: Array<{
    id: string;
    title: string;
    latitude: number;
    longitude: number;
    claimStatus: string;
    artistId?: string;
    yearCreated?: number;
  }> = [];

  // Unclaimed artworks (no artist)
  for (let i = 0; i < 5; i++) {
    const location = getRandomItem(locations);
    const artwork = await prisma.artwork.create({
      data: {
        title: `Urban Expression ${i + 1}`,
        latitude: location.lat + Math.random() * 0.001,
        longitude: location.lon + Math.random() * 0.001,
        address: `${location.city}, ${location.country}`,
        claimStatus: "UNCLAIMED",
        createdById: admin.id,
        yearCreated: 2019 + Math.floor(Math.random() * 5),
      },
    });
    artworks.push({
      id: artwork.id,
      title: artwork.title,
      latitude: artwork.latitude,
      longitude: artwork.longitude,
      claimStatus: "UNCLAIMED",
      yearCreated: artwork.yearCreated,
    });
  }
  console.log(`✓ Unclaimed artworks: 5`);

  // Artworks with pending claims (no photos yet)
  for (let i = 0; i < 3; i++) {
    const location = getRandomItem(locations);
    const artist = i === 0 ? artistPending1 : artistPending2;
    const artwork = await prisma.artwork.create({
      data: {
        title: `Pending Claim ${i + 1}`,
        latitude: location.lat + Math.random() * 0.001,
        longitude: location.lon + Math.random() * 0.001,
        address: `${location.city}, ${location.country}`,
        claimStatus: "PENDING_APPROVAL",
        createdById: admin.id,
        artistId: artist.id,
        yearCreated: 2020 + Math.floor(Math.random() * 4),
      },
    });
    artworks.push({
      id: artwork.id,
      title: artwork.title,
      latitude: artwork.latitude,
      longitude: artwork.longitude,
      claimStatus: "PENDING_APPROVAL",
      artistId: artist.id,
      yearCreated: artwork.yearCreated,
    });
  }
  console.log(`✓ Pending claim artworks: 3`);

  // Claimed artworks (approved - active artists)
  for (let i = 0; i < 4; i++) {
    const location = getRandomItem(locations);
    const artist = [artistActive1, artistActive2, artistActive3][
      i % 3
    ];
    const artwork = await prisma.artwork.create({
      data: {
        title: `Claimed Masterpiece ${i + 1}`,
        latitude: location.lat + Math.random() * 0.001,
        longitude: location.lon + Math.random() * 0.001,
        address: `${location.city}, ${location.country}`,
        claimStatus: "CLAIMED",
        createdById: admin.id,
        artistId: artist.id,
        yearCreated: 2018 + Math.floor(Math.random() * 6),
      },
    });
    artworks.push({
      id: artwork.id,
      title: artwork.title,
      latitude: artwork.latitude,
      longitude: artwork.longitude,
      claimStatus: "CLAIMED",
      artistId: artist.id,
      yearCreated: artwork.yearCreated,
    });
  }
  console.log(`✓ Claimed artworks (active artists): 4`);

  // Claimed artworks by full-activity artists
  for (let i = 0; i < 5; i++) {
    const location = getRandomItem(locations);
    const artist = i < 3 ? artistFull1 : artistFull2;
    const artwork = await prisma.artwork.create({
      data: {
        title: `${artist.artistName} Creation ${i + 1}`,
        latitude: location.lat + Math.random() * 0.001,
        longitude: location.lon + Math.random() * 0.001,
        address: `${location.city}, ${location.country}`,
        claimStatus: "CLAIMED",
        createdById: admin.id,
        artistId: artist.id,
        yearCreated: 2017 + Math.floor(Math.random() * 7),
      },
    });
    artworks.push({
      id: artwork.id,
      title: artwork.title,
      latitude: artwork.latitude,
      longitude: artwork.longitude,
      claimStatus: "CLAIMED",
      artistId: artist.id,
      yearCreated: artwork.yearCreated,
    });
  }
  console.log(`✓ Claimed artworks (full-activity artists): 5`);

  console.log(`✓ Total artworks created: ${artworks.length}`);

  // Create photos and associate with artworks
  console.log("📸 Creating photos and associations...");
  let photosCreated = 0;

  // Photos for unclaimed artworks (2-3 per artwork)
  const unclaimedArtworks = artworks.filter((a) => a.claimStatus === "UNCLAIMED");
  for (const artwork of unclaimedArtworks) {
    const photoCount = 2 + Math.floor(Math.random() * 2);
    for (let i = 0; i < photoCount; i++) {
      if (imageIndex >= availableImages.length) break;

      const photoUrl = availableImages[imageIndex++];
      await prisma.photo.create({
        data: {
          artworkId: artwork.id,
          userId: getRandomItem([regularPhotographer1, regularPhotographer2]).id,
          photoUrl,
          takenAt: new Date("2019-06-25"),
          isPrivate: false,
        },
      });
      photosCreated++;
    }
  }

  // Photos for claimed artworks (4-8 per artwork)
  const claimedArtworks = artworks.filter((a) => a.claimStatus === "CLAIMED");
  for (const artwork of claimedArtworks) {
    const photoCount = 4 + Math.floor(Math.random() * 5);
    for (let i = 0; i < photoCount; i++) {
      if (imageIndex >= availableImages.length) break;

      const photoUrl = availableImages[imageIndex++];
      const uploadedById = artwork.artistId
        ? allArtists.find((a) => a.id === artwork.artistId)?.id ||
          admin.id
        : regularPhotographer1.id;

      const photo = await prisma.photo.create({
        data: {
          artworkId: artwork.id,
          userId: uploadedById,
          photoUrl,
          takenAt: new Date("2019-06-25"),
          isPrivate: false,
        },
      });
      photosCreated++;

      // Create gallery entry for claimed artwork
      const galleryType = Math.random() > 0.7 ? "OFFICIAL" : "DEFAULT";
      const gallery = await prisma.gallery.findFirst({
        where: {
          artworkId: artwork.id,
          type: galleryType,
        },
      });

      if (!gallery) {
        await prisma.gallery.create({
          data: {
            artworkId: artwork.id,
            type: galleryType,
            createdByArtistId: artwork.artistId || undefined,
          },
        });
      }

      const galleryRecord = await prisma.gallery.findFirst({
        where: {
          artworkId: artwork.id,
          type: galleryType,
        },
      });

      if (galleryRecord) {
        await prisma.galleryPhoto.create({
          data: {
            galleryId: galleryRecord.id,
            photoId: photo.id,
            order: i,
          },
        });
      }
    }
  }

  console.log(`✓ Photos created: ${photosCreated}`);

  // Add photos to users who only upload photos (no claims)
  console.log("📷 Adding photos for non-artist photographers...");
  const photoCountPerPhotographer = Math.floor(availableImages.length / 10);
  for (const photographer of [regularPhotographer1, regularPhotographer2]) {
    for (let i = 0; i < photoCountPerPhotographer; i++) {
      if (imageIndex >= availableImages.length) break;

      const photoUrl = availableImages[imageIndex++];
      await prisma.photo.create({
        data: {
          userId: photographer.id,
          photoUrl,
          takenAt: new Date("2019-06-25"),
          isPrivate: false,
          // Note: these photos are NOT linked to artworks
        },
      });
    }
  }
  console.log(`✓ Added ${photoCountPerPhotographer * 2} photos for photographers`);

  // Create Artist browse records for all claimed artworks
  // This simulates the curation system auto-creating Artist records
  console.log("🎯 Creating browse system records...");
  const claimedByArtists = new Map<string, string>();

  for (const artwork of claimedArtworks) {
    if (artwork.artistId) {
      const artist = allArtists.find((a) => a.id === artwork.artistId);
      if (artist && artist.artistName) {
        if (!claimedByArtists.has(artist.artistName)) {
          const artistRecord = await prisma.artist.upsert({
            where: { name: artist.artistName },
            update: {
              artworkCount: {
                increment: 1,
              },
            },
            create: {
              name: artist.artistName,
              artworkCount: 1,
            },
          });
          claimedByArtists.set(artist.artistName, artistRecord.id);
        } else {
          await prisma.artist.update({
            where: { name: artist.artistName },
            data: {
              artworkCount: {
                increment: 1,
              },
            },
          });
        }
      }
    }
  }
  console.log(`✓ Artist browse records: ${claimedByArtists.size}`);

  // Create Country records from ALL artwork locations (countries are location-based)
  const countrySet = new Set<string>();
  for (const artwork of artworks) {
    const location = locations.find(
      (l) =>
        Math.abs(l.lat - artwork.latitude) < 0.01 &&
        Math.abs(l.lon - artwork.longitude) < 0.01
    );
    if (location) {
      countrySet.add(location.country);
    }
  }

  for (const country of countrySet) {
    const artworkCount = artworks.filter((a) => {
      const location = locations.find(
        (l) =>
          Math.abs(l.lat - a.latitude) < 0.01 &&
          Math.abs(l.lon - a.longitude) < 0.01
      );
      return location?.country === country;
    }).length;

    await prisma.country.upsert({
      where: { name: country },
      update: {
        artworkCount: {
          increment: artworkCount,
        },
      },
      create: {
        name: country,
        artworkCount,
      },
    });
  }
  console.log(`✓ Country browse records: ${countrySet.size}`);

  // Create Year records from CLAIMED artworks only
  const yearSet = new Set<number>();
  for (const artwork of claimedArtworks) {
    if (artwork.yearCreated) {
      yearSet.add(artwork.yearCreated);
    }
  }

  for (const year of yearSet) {
    const artworkCount = claimedArtworks.filter(
      (a) => a.yearCreated === year
    ).length;

    await prisma.artworkYear.upsert({
      where: { year },
      update: {
        artworkCount: {
          increment: artworkCount,
        },
      },
      create: {
        year,
        artworkCount,
      },
    });
  }
  console.log(`✓ Year browse records: ${yearSet.size}`);

  // Create collections
  console.log("📚 Creating collections...");

  // Collection by photographer 1 (private, photos from their uploads)
  const collection1 = await prisma.collection.create({
    data: {
      userId: regularPhotographer1.id,
      name: "My Street Art Discoveries",
      description: "Best street art photos I've taken",
      isPublic: false,
    },
  });

  // Add some unclaimed artworks to this collection
  for (const artwork of getRandomItems(
    unclaimedArtworks.map((a) => a.id),
    3
  )) {
    await prisma.collectionItem.create({
      data: {
        collectionId: collection1.id,
        artworkId: artwork,
      },
    });
  }

  // Collection by artist with activity (public, mixed artworks)
  const collection2 = await prisma.collection.create({
    data: {
      userId: artistFull1.id,
      name: "Inspiration Board",
      description: "Artists and works that inspire me",
      isPublic: true,
    },
  });

  // Mix of claimed and unclaimed artworks
  const inspiredArtworks = [
    ...getRandomItems(
      claimedArtworks.map((a) => a.id),
      4
    ),
    ...getRandomItems(
      unclaimedArtworks.map((a) => a.id),
      3
    ),
  ];

  for (const artwork of inspiredArtworks) {
    await prisma.collectionItem.create({
      data: {
        collectionId: collection2.id,
        artworkId: artwork,
      },
    });
  }

  // Collection by admin (public, all claimed artworks)
  const collection3 = await prisma.collection.create({
    data: {
      userId: admin.id,
      name: "Featured Artists",
      description: "Curated collection of claimed artworks",
      isPublic: true,
    },
  });

  for (const artwork of getRandomItems(
    claimedArtworks.map((a) => a.id),
    6
  )) {
    await prisma.collectionItem.create({
      data: {
        collectionId: collection3.id,
        artworkId: artwork,
      },
    });
  }

  // Collection by another artist (private)
  const collection4 = await prisma.collection.create({
    data: {
      userId: artistActive1.id,
      name: "Personal Gallery",
      description: "Works I want to remember",
      isPublic: false,
    },
  });

  for (const artwork of getRandomItems(
    unclaimedArtworks.map((a) => a.id),
    2
  )) {
    await prisma.collectionItem.create({
      data: {
        collectionId: collection4.id,
        artworkId: artwork,
      },
    });
  }

  console.log(`✓ Collections created: 4`);

  // Create some saves (bookmarks)
  console.log("💾 Creating saves...");
  for (const user of [
    regularUser1,
    regularUser2,
    artistActive1,
    artistActive2,
  ]) {
    const savedArtworks = getRandomItems(
      artworks.map((a) => a.id),
      3 + Math.floor(Math.random() * 4)
    );
    for (const artworkId of savedArtworks) {
      await prisma.save.create({
        data: {
          userId: user.id,
          artworkId,
        },
      }).catch(() => {
        // Ignore duplicates
      });
    }
  }
  console.log(`✓ Saves created`);

  // Summary
  console.log("\n✨ Seed complete!");
  console.log(
    `📊 Summary:
    - Users created: 15 (1 admin, 3 regular, 2 photographers, 2 artists no activity, 2 artists pending, 3 artists active, 2 artists full)
    - Artworks created: ${artworks.length} (5 unclaimed, 3 pending, 4 active, 5 full-activity)
    - Photos created: ${photosCreated + photoCountPerPhotographer * 2}
    - Collections created: 4
    - Browse records (Artist/Country/Year): Ready for browse endpoints
    `
  );

  console.log("\n🔐 Test credentials (email/password via Supabase):");
  console.log(`Admin: admin@wandergraff.local`);
  console.log(`Artist (full activity): yael@wandergraff.local (artist: Yael Montufar)`);
  console.log(`Regular user: explorer1@wandergraff.local`);
  console.log(`Photographer: photographer1@wandergraff.local`);

  console.log("\n🎯 Use 'npm run db:seed' to seed additional data without resetting.");
  console.log("🎯 Use 'npm run db:wipe' to delete all data before seeding manually.");
}

seed()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  });
