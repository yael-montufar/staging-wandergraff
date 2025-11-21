import { execSync } from "child_process";

// Step 1: Generate Prisma client
console.log("📦 Generating Prisma client...");
try {
  execSync("prisma generate", { stdio: "inherit" });
} catch (err) {
  console.error("❌ Prisma generate failed:", err.message);
  process.exit(1);
}

// Step 2: Build React Router
console.log("\n🔨 Building React Router...");
try {
  execSync("react-router build", { stdio: "inherit" });
} catch (err) {
  console.error("❌ React Router build failed:", err.message);
  process.exit(1);
}

console.log("\n✨ Build complete!");
