import { config } from "dotenv";
import { resolve } from "path";

// Load .env file
config({ path: resolve(process.cwd(), ".env") });

import { prismaClient } from "../app/lib/db.server";

async function wipeDatabase() {
  const prisma = await prismaClient();

  console.log("⚠️  Wiping all data from database...");

  try {
    // Delete in reverse order of FK dependencies
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

    console.log("✅ Database wiped successfully");
    console.log("💡 Run 'npm run db:seed' to populate with test data");
  } catch (error) {
    console.error("❌ Error wiping database:", error);
    process.exit(1);
  }
}

wipeDatabase();
