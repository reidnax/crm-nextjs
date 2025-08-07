#!/usr/bin/env node

/**
 * Database Migration Script for Vercel/Production Deployment
 *
 * This script handles database migrations and seeding for the CRM application.
 * It can be run locally or in production environments.
 *
 * Usage:
 *   node scripts/migrate.js [action]
 *
 * Actions:
 *   - migrate: Run migrations only
 *   - seed: Run seeding only
 *   - setup: Run migrations + seeding
 *   - status: Check migration status
 */

const { exec } = require("child_process");
const path = require("path");

const ACTION = process.argv[2] || "setup";
const IS_PRODUCTION =
  process.env.NODE_ENV === "production" || process.env.VERCEL === "1";

console.log("🚀 CRM Migration Script");
console.log(`📍 Environment: ${IS_PRODUCTION ? "Production" : "Development"}`);
console.log(`🎯 Action: ${ACTION}`);
console.log("");

/**
 * Execute a command and return a promise
 */
function execCommand(command, description) {
  return new Promise((resolve, reject) => {
    console.log(`📦 ${description}...`);
    console.log(`   Command: ${command}`);

    const child = exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(`❌ ${description} failed:`, error.message);
        reject(error);
        return;
      }

      if (stderr && !stderr.includes("Warning")) {
        console.error(`⚠️  ${description} stderr:`, stderr);
      }

      console.log(`✅ ${description} completed`);
      if (stdout.trim()) {
        console.log(`   Output: ${stdout.trim()}`);
      }
      console.log("");

      resolve(stdout);
    });

    // Log output in real-time for long-running commands
    child.stdout.on("data", (data) => {
      process.stdout.write(`   ${data}`);
    });

    child.stderr.on("data", (data) => {
      process.stderr.write(`   ${data}`);
    });
  });
}

/**
 * Check if database is accessible
 */
async function checkDatabase() {
  try {
    await execCommand(
      "npx prisma db pull --force",
      "Database connection check"
    );
    return true;
  } catch (error) {
    console.error("❌ Database connection failed");
    return false;
  }
}

/**
 * Run database migrations
 */
async function runMigrations() {
  try {
    await execCommand("npx prisma migrate deploy", "Database migrations");
    return true;
  } catch (error) {
    console.error("❌ Migration failed");
    throw error;
  }
}

/**
 * Run database seeding
 */
async function runSeeding() {
  try {
    await execCommand(
      "npx tsx src/lib/permissions/seed-permissions.ts",
      "Permission system seeding"
    );
    return true;
  } catch (error) {
    console.error("❌ Seeding failed");
    throw error;
  }
}

/**
 * Get migration status
 */
async function getStatus() {
  try {
    await execCommand("npx prisma migrate status", "Migration status check");
    await execCommand("npx prisma db pull --print", "Current schema check");
  } catch (error) {
    console.error("❌ Status check failed");
  }
}

/**
 * Main execution function
 */
async function main() {
  try {
    // Always generate Prisma client first
    await execCommand("npx prisma generate", "Prisma client generation");

    switch (ACTION) {
      case "migrate":
        console.log("🔄 Running migrations only...\n");
        await runMigrations();
        break;

      case "seed":
        console.log("🌱 Running seeding only...\n");
        await runSeeding();
        break;

      case "setup":
        console.log("🚀 Running full setup (migrations + seeding)...\n");
        await runMigrations();
        await runSeeding();
        break;

      case "status":
        console.log("📊 Checking migration status...\n");
        await getStatus();
        break;

      default:
        console.error(`❌ Unknown action: ${ACTION}`);
        console.log("Valid actions: migrate, seed, setup, status");
        process.exit(1);
    }

    console.log("🎉 Migration script completed successfully!");

    if (ACTION !== "status") {
      console.log("\n📋 Next steps:");
      console.log("   1. Verify your application is working");
      console.log("   2. Check database tables are created");
      console.log("   3. Test user authentication and permissions");
    }
  } catch (error) {
    console.error("💥 Migration script failed:", error.message);
    process.exit(1);
  }
}

// Handle unhandled promise rejections
process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
  process.exit(1);
});

// Run the main function
main();
