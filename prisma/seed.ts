import { config } from "dotenv";
import { resolve } from "path";

// Load .env file
config({ path: resolve(process.cwd(), ".env") });

import { prismaClient } from "../app/lib/db.server";

// Mock photo URLs (using picsum.photos for random images)
const MOCK_PHOTO_URLS = Array.from({ length: 32 }, (_, i) =>
  `https://picsum.photos/600/600?random=${i + 1}`
);

function getRandomItems<T>(arr: T[], count: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, arr.length));
}

function getRandomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function seed() {
  const prisma = await prismaClient();

  console.log("🌱 Starting database seed...");

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

  // Create users
  console.log("👥 Creating users...");

  const admin = await prisma.user.create({
    data: {
      email: "admin@wandergraff.local",
      name: "Admin User",
      role: "ADMIN",
    },
  });

  const artist1 = await prisma.user.create({
    data: {
      email: "artist1@wandergraff.local",
      name: "Lucia Romero",
      role: "ARTIST",
      artistName: "Lucia Romero",
      artistBio: "Vibrant street muralist",
      artistInstagram: "@luciaromerart",
    },
  });

  const artist2 = await prisma.user.create({
    data: {
      email: "artist2@wandergraff.local",
      name: "Jordan Blake",
      role: "ARTIST",
      artistName: "Jordan Blake",
      artistBio: "Contemporary street artist",
      artistInstagram: "@jordanblakeart",
    },
  });

  const artist3 = await prisma.user.create({
    data: {
      email: "artist3@wandergraff.local",
      name: "Sam Rivera",
      role: "ARTIST",
      artistName: "Sam Rivera",
      artistBio: "Muralist and illustrator",
    },
  });

  const artist4 = await prisma.user.create({
    data: {
      email: "artist4@wandergraff.local",
      name: "Casey Huang",
      role: "ARTIST",
      artistName: "Casey Huang",
      artistBio: "Street art pioneer",
    },
  });

  const explorer1 = await prisma.user.create({
    data: {
      email: "explorer1@wandergraff.local",
      name: "Alex Chen",
      role: "REGULAR_USER",
      bio: "Street art enthusiast",
    },
  });

  const explorer2 = await prisma.user.create({
    data: {
      email: "explorer2@wandergraff.local",
      name: "Jordan Smith",
      role: "REGULAR_USER",
      bio: "Photography lover",
    },
  });

  const explorer3 = await prisma.user.create({
    data: {
      email: "explorer3@wandergraff.local",
      name: "Taylor Johnson",
      role: "REGULAR_USER",
    },
  });

  console.log(
    `✓ Admin: ${admin.email}`
  );
  console.log(
    `✓ Artists: ${artist1.name}, ${artist2.name}, ${artist3.name}, ${artist4.name}`
  );
  console.log(
    `✓ Regular users: ${explorer1.name}, ${explorer2.name}, ${explorer3.name}`
  );

  // Create countries
  console.log("🌍 Creating countries...");
  const countries = [];
  const countryData = [
    { name: "United States", code: "US" },
    { name: "Germany", code: "DE" },
    { name: "Argentina", code: "AR" },
    { name: "Brazil", code: "BR" },
  ];

  for (const data of countryData) {
    const country = await prisma.country.create({
      data: {
        name: data.name,
        code: data.code,
        artworkCount: 0,
      },
    });
    countries.push(country);
  }
  console.log(`✓ Countries: ${countries.length}`);

  // Create artworks
  console.log("🎨 Creating artworks...");

  const artworkLocations = [
    {
      title: "Lucia Romero Creation 1",
      lat: 34.1028,
      lon: -118.2671,
      address: "Los Angeles, United States",
      artist: artist1,
      country: countries[0],
      year: 2022,
    },
    {
      title: "Lucia Romero Creation 2",
      lat: 34.1025,
      lon: -118.2668,
      address: "Los Angeles, United States",
      artist: artist1,
      country: countries[0],
      year: 2023,
    },
    {
      title: "Jordan Blake Masterpiece 1",
      lat: 52.5170,
      lon: 13.3888,
      address: "Berlin, Germany",
      artist: artist2,
      country: countries[1],
      year: 2021,
    },
    {
      title: "Jordan Blake Masterpiece 2",
      lat: 52.5175,
      lon: 13.3891,
      address: "Berlin, Germany",
      artist: artist2,
      country: countries[1],
      year: 2023,
    },
    {
      title: "Urban Expression 1",
      lat: -34.6037,
      lon: -58.3816,
      address: "Buenos Aires, Argentina",
      artist: null,
      country: countries[2],
      year: null,
    },
    {
      title: "Urban Expression 2",
      lat: -34.6046,
      lon: -58.3815,
      address: "Buenos Aires, Argentina",
      artist: null,
      country: countries[2],
      year: null,
    },
    {
      title: "Sam Rivera Work",
      lat: -23.5505,
      lon: -46.6333,
      address: "São Paulo, Brazil",
      artist: artist3,
      country: countries[3],
      year: 2022,
    },
  ];

  const artworks: Array<{
    id: string;
    title: string;
    artist?: typeof artist1;
  }> = [];

  let photoIndex = 0;

  for (const location of artworkLocations) {
    const artwork = await prisma.artwork.create({
      data: {
        title: location.title,
        latitude: location.lat,
        longitude: location.lon,
        address: location.address,
        yearCreated: location.year,
        claimStatus: location.artist ? "CLAIMED" : "UNCLAIMED",
        createdById: admin.id,
        artistId: location.artist?.id,
        countryId: location.country.id,
      },
    });

    artworks.push({
      id: artwork.id,
      title: artwork.title,
      artist: location.artist,
    });
  }

  console.log(
    `✓ Unclaimed artworks: 2`
  );
  console.log(
    `✓ Claimed artworks: 5`
  );

  // Create photos and galleries for claimed artworks
  console.log("📸 Creating photos with galleries...");

  let photosCreated = 0;
  const galleryPresets = ["preset_1", "preset_2", "preset_3", "preset_4", "preset_5"];

  for (const artwork of artworks) {
    if (artwork.artist) {
      // Create 8-10 photos for claimed artworks
      const photoCount = 8 + Math.floor(Math.random() * 3);
      const photoIds: string[] = [];

      for (let i = 0; i < photoCount && photoIndex < MOCK_PHOTO_URLS.length; i++) {
        const photo = await prisma.photo.create({
          data: {
            artworkId: artwork.id,
            userId: artwork.artist.id,
            photoUrl: MOCK_PHOTO_URLS[photoIndex++],
            takenAt: new Date(2023, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1),
            isPrivate: false,
          },
        });
        photoIds.push(photo.id);
        photosCreated++;
      }

      // Create official gallery
      if (photoIds.length > 0) {
        const gallery = await prisma.gallery.create({
          data: {
            artworkId: artwork.id,
            type: "OFFICIAL",
            createdByArtistId: artwork.artist.id,
          },
        });

        // Add photos to gallery in order
        for (let i = 0; i < photoIds.length; i++) {
          await prisma.galleryPhoto.create({
            data: {
              galleryId: gallery.id,
              photoId: photoIds[i],
              order: i,
            },
          });
        }

        // Update artwork with gallery curation data
        const randomPreset = getRandomItem(galleryPresets);
        await prisma.artwork.update({
          where: { id: artwork.id },
          data: {
            galleryImageOrder: photoIds,
            galleryPreset: randomPreset,
            galleryPublished: true,
          },
        });
      }
    } else {
      // Create 2-3 photos for unclaimed artworks (community only)
      const photoCount = 2 + Math.floor(Math.random() * 2);

      for (let i = 0; i < photoCount && photoIndex < MOCK_PHOTO_URLS.length; i++) {
        await prisma.photo.create({
          data: {
            artworkId: artwork.id,
            userId: getRandomItem([explorer1, explorer2]).id,
            photoUrl: MOCK_PHOTO_URLS[photoIndex++],
            takenAt: new Date(2023, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1),
            isPrivate: false,
          },
        });
        photosCreated++;
      }
    }
  }

  console.log(`✓ Photos created: ${photosCreated}`);

  // Create browse system records
  console.log("🎯 Creating browse records...");

  // Artist records
  const artistSet = new Set<string>();
  for (const artwork of artworks) {
    if (artwork.artist?.artistName && !artistSet.has(artwork.artist.artistName)) {
      await prisma.artist.create({
        data: {
          name: artwork.artist.artistName,
          artworkCount: artworks.filter(
            (a) => a.artist?.id === artwork.artist?.id
          ).length,
        },
      });
      artistSet.add(artwork.artist.artistName);
    }
  }
  console.log(`✓ Artist browse records: ${artistSet.size}`);

  // Country records - update counts
  for (const country of countries) {
    const count = await prisma.artwork.count({
      where: { countryId: country.id },
    });
    if (count > 0) {
      await prisma.country.update({
        where: { id: country.id },
        data: { artworkCount: count },
      });
    }
  }
  console.log(`✓ Country records: ${countries.length}`);

  // Year records
  const years = new Set<number>();
  for (const artwork of artworks) {
    if (artwork.artist && artwork.title && artwork.title.includes(artwork.artist.name)) {
      // Extract year from title or use random
      const yearMatch = artwork.title.match(/\d{4}/);
      if (yearMatch) {
        years.add(parseInt(yearMatch[0]));
      }
    }
  }

  // Add years from artworkLocations
  for (const location of artworkLocations) {
    if (location.year) {
      years.add(location.year);
    }
  }

  for (const year of years) {
    const count = await prisma.artwork.count({
      where: { yearCreated: year },
    });
    if (count > 0) {
      await prisma.artworkYear.create({
        data: {
          year,
          artworkCount: count,
        },
      });
    }
  }
  console.log(`✓ Year records: ${years.size}`);

  // Create collections
  console.log("📚 Creating collections...");

  await prisma.collection.create({
    data: {
      userId: explorer1.id,
      name: "Favorite Murals",
      description: "Street art I love",
      isPublic: true,
    },
  });

  await prisma.collection.create({
    data: {
      userId: artist1.id,
      name: "Inspiration Board",
      description: "Works that inspire my art",
      isPublic: true,
    },
  });

  console.log(`✓ Collections: 2`);

  // Summary
  console.log("\n✨ Seed complete!");
  console.log(`
📊 Summary:
  - Users: 8 (1 admin, 4 artists, 3 regular)
  - Artworks: 7 (2 unclaimed, 5 claimed)
  - Photos: ${photosCreated}
  - Claimed artworks with galleries: 5
  - Gallery presets used: randomly assigned
  - Browse records:
    * Artists: ${artistSet.size}
    * Countries: ${countries.length}
    * Years: ${years.size}
  - Collections: 2

🎯 Test Accounts (use Google OAuth to sign in):
  - Admin: admin@wandergraff.local
  - Artist with galleries: lucia@wandergraff.local (Lucia Romero)
  - Regular user: explorer1@wandergraff.local (Alex Chen)

💡 Next Steps:
  1. Test gallery curation at /artwork/:id/edit-gallery
  2. View official galleries at /artwork/:id
  3. Browse artists, countries, years
  4. Create your own artworks and galleries
  `);
}

seed()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  });
