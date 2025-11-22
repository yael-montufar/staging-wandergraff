import { config } from "dotenv";
import { resolve } from "path";

// Load .env file
config({ path: resolve(process.cwd(), ".env") });

import { prismaClient } from "../app/lib/db.server";

async function main() {
  const prisma = await prismaClient();

  console.log("\n╔════════════════════════════════════════════╗");
  console.log("║         Admin User Diagnostic              ║");
  console.log("╚════════════════════════════════════════════╝\n");

  // Find all admin users
  const admins = await prisma.user.findMany({
    where: { role: "ADMIN" },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      createdAt: true,
    },
  });

  if (admins.length === 0) {
    console.log("❌ No admin users found in database!\n");
    console.log("📋 Solution: Run npm run admin:create -- --email admin@example.com --name Admin\n");
    process.exit(1);
  }

  console.log("✅ Found admin users:\n");
  for (const admin of admins) {
    console.log(`   📧 Email: ${admin.email}`);
    console.log(`   👤 Name: ${admin.name}`);
    console.log(`   🆔 ID: ${admin.id}`);
    console.log(`   🎯 Role: ${admin.role}`);
    console.log(`   📅 Created: ${admin.createdAt.toLocaleString()}\n`);
  }

  // Check for your specific email
  const yourEmail = "nimda.inmo@gmail.com";
  const yourUser = await prisma.user.findUnique({
    where: { email: yourEmail },
  });

  console.log(`\n🔍 Checking for: ${yourEmail}`);
  if (yourUser) {
    console.log(`   ✅ Found!`);
    console.log(`   🆔 ID: ${yourUser.id}`);
    console.log(`   🎯 Role: ${yourUser.role}`);
    if (yourUser.role !== "ADMIN") {
      console.log(`\n   ⚠️  User exists but role is ${yourUser.role}, not ADMIN!`);
      console.log(`   Fix: Update role to ADMIN\n`);
    }
  } else {
    console.log(`   ❌ NOT found in database!`);
    console.log(`   This is likely why you can't access admin dashboard\n`);
  }

  // Show all users (for debugging)
  console.log("\n📊 All users in database:\n");
  const allUsers = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      role: true,
    },
    orderBy: { createdAt: "desc" },
  });

  for (const user of allUsers) {
    const badge = user.role === "ADMIN" ? "👑" : user.role === "ARTIST" ? "🎨" : "👤";
    console.log(`   ${badge} ${user.email} (${user.role})`);
    console.log(`      ID: ${user.id}\n`);
  }

  console.log("\n💡 Debugging Tips:\n");
  console.log("   1. Check browser DevTools > Application > Cookies");
  console.log("   2. Look for 'auth-token' cookie");
  console.log("   3. Verify cookie value starts with 'eyJ' (JWT header)");
  console.log("   4. Copy the token and paste at jwt.io to decode");
  console.log("   5. Check 'sub' field matches user ID in database above\n");

  process.exit(0);
}

main().catch((e) => {
  console.error("Error:", e);
  process.exit(1);
});
