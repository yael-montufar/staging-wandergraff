import { config } from "dotenv";
import { resolve } from "path";
import * as readline from "readline";

// Load .env file
config({ path: resolve(process.cwd(), ".env") });

import { prismaClient } from "../app/lib/db.server";

interface AdminCreateOptions {
  email: string;
  name: string;
}

async function promptUser(question: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function createAdmin(options: AdminCreateOptions) {
  const prisma = await prismaClient();

  console.log("\n🔐 Creating admin user...");
  console.log(`   Email: ${options.email}`);
  console.log(`   Name: ${options.name}`);
  console.log(`   Role: ADMIN\n`);

  // Check if user already exists
  const existingUser = await prisma.user.findUnique({
    where: { email: options.email },
  });

  if (existingUser) {
    if (existingUser.role === "ADMIN") {
      console.log("✅ User already exists as admin!");
      console.log(`   Email: ${existingUser.email}`);
      console.log(`   Name: ${existingUser.name}`);
      return existingUser;
    } else {
      console.log("⚠️  User exists but is not an admin. Upgrading to ADMIN role...");
      const updated = await prisma.user.update({
        where: { email: options.email },
        data: { role: "ADMIN" },
      });
      console.log("✅ User upgraded to ADMIN!");
      return updated;
    }
  }

  // Create new admin user
  try {
    const user = await prisma.user.create({
      data: {
        email: options.email,
        name: options.name,
        role: "ADMIN",
      },
    });

    console.log("✅ Admin user created successfully!\n");
    console.log("📝 User Details:");
    console.log(`   ID: ${user.id}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Name: ${user.name}`);
    console.log(`   Role: ${user.role}`);
    console.log(`   Created: ${user.createdAt.toLocaleString()}\n`);

    console.log("🔑 Authentication:");
    console.log("   - Use Google OAuth to sign in");
    console.log("   - Visit: http://localhost:5173/auth/login");
    console.log("   - Email: " + user.email + "\n");

    console.log("📊 Next Steps:");
    console.log("   1. Sign in with Google OAuth");
    console.log("   2. Navigate to /admin/dashboard");
    console.log("   3. Approve/reject pending artwork claims\n");

    return user;
  } catch (error) {
    if (error instanceof Error && error.message.includes("Unique constraint")) {
      console.error("❌ User with this email already exists!");
      return null;
    }
    throw error;
  }
}

async function main() {
  console.log("\n╔═══════════════════════════════════════════��╗");
  console.log("║         Create Admin User                  ║");
  console.log("╚════════════════════════════════════════════╝\n");

  // Parse command line arguments
  const args = process.argv.slice(2);
  let email = "";
  let name = "";

  // Extract --email and --name from args
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--email" && args[i + 1]) {
      email = args[i + 1];
      i++;
    } else if (args[i] === "--name" && args[i + 1]) {
      name = args[i + 1];
      i++;
    }
  }

  // If no args provided, prompt user interactively
  if (!email || !name) {
    console.log("📋 Interactive Mode\n");

    if (!email) {
      email = await promptUser("Enter admin email: ");
      if (!email) {
        console.error("❌ Email is required!");
        process.exit(1);
      }
    }

    if (!name) {
      name = await promptUser("Enter admin name: ");
      if (!name) {
        console.error("❌ Name is required!");
        process.exit(1);
      }
    }
  }

  // Validate email format
  if (!email.includes("@")) {
    console.error("❌ Invalid email format!");
    process.exit(1);
  }

  try {
    await createAdmin({ email, name });
    process.exit(0);
  } catch (error) {
    console.error("❌ Error creating admin user:");
    console.error(error);
    process.exit(1);
  }
}

main();
