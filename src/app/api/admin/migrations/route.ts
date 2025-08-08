import { NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/api-response";
import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs/promises";
import path from "path";

const execAsync = promisify(exec);

// Helper function to check if user is Admin Dev
async function isAdminDev(session: any): Promise<boolean> {
  return session?.user?.role === "Admin-Dev" || session?.user?.role === "Admin";
}

// GET /api/admin/migrations - Get migration status and history
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !(await isAdminDev(session))) {
      return errorResponse("Forbidden: Admin access required", 403);
    }

    // Get migration status (handle non-zero exit codes for pending migrations)
    let statusOutput = "";
    try {
      const { stdout } = await execAsync("npx prisma migrate status");
      statusOutput = stdout;
    } catch (error: any) {
      // Prisma migrate status returns non-zero exit code when migrations are pending
      // This is expected behavior, so we use the stdout from the error
      statusOutput = error.stdout || "";
      if (!error.stdout) {
        throw error; // Re-throw if it's a real error
      }
    }

    // Get migration history
    const migrationsDir = path.join(process.cwd(), "prisma", "migrations");
    const migrationFolders = await fs.readdir(migrationsDir);

    // Check if there are pending migrations mentioned in the output
    const hasPendingMigrations =
      statusOutput.includes("Following migration have not yet been applied") ||
      statusOutput.includes("migration have not yet been applied");

    // Get list of pending migrations from status output
    const pendingMigrations = new Set<string>();
    if (hasPendingMigrations) {
      const pendingSection = statusOutput.split(
        "Following migration have not yet been applied:"
      )[1];
      if (pendingSection) {
        pendingSection
          .split("\n")
          .forEach((line) => {
            const trimmed = line.trim();
            if (trimmed && !trimmed.includes("To apply migrations")) {
              pendingMigrations.add(trimmed);
            }
          });
      }
    }

    const migrations = [];
    for (const folder of migrationFolders) {
      if (folder === "migration_lock.toml") continue;

      const folderPath = path.join(migrationsDir, folder);
      const stat = await fs.stat(folderPath);

      if (stat.isDirectory()) {
        const migrationSqlPath = path.join(folderPath, "migration.sql");
        let sqlContent = "";

        try {
          sqlContent = await fs.readFile(migrationSqlPath, "utf-8");
        } catch (error) {
          sqlContent = "-- Migration file not found or empty";
        }

        // Determine deployment status
        const isDeployed = !pendingMigrations.has(folder);
        const status = isDeployed ? 'deployed' : 'pending';

        migrations.push({
          name: folder,
          timestamp: folder.substring(0, 14),
          description: folder.substring(15),
          created: stat.birthtime,
          status,
          isDeployed,
          sqlContent:
            sqlContent.substring(0, 500) +
            (sqlContent.length > 500 ? "..." : ""),
          fullSqlContent: sqlContent,
        });
      }
    }

    // Sort migrations by timestamp (newest first)
    migrations.sort((a, b) => b.timestamp.localeCompare(a.timestamp));

    // Calculate counts from the migrations array
    const appliedCount = migrations.filter(m => m.isDeployed).length;
    const pendingCount = migrations.filter(m => !m.isDeployed).length;
    const totalMigrations = migrations.length;

    return successResponse({
      status: {
        applied: appliedCount,
        pending: pendingCount,
        total: migrations.length,
        lastMigration: migrations[0]?.name || null,
        output: statusOutput,
      },
      migrations,
      totalMigrations: migrations.length,
    });
  } catch (error) {
    console.error("Error getting migration status:", error);
    return errorResponse("Failed to get migration status");
  }
}

// POST /api/admin/migrations - Run migrations
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !(await isAdminDev(session))) {
      return errorResponse("Forbidden: Admin access required", 403);
    }

    const body = await request.json();
    const { action, migrationName, targetDatabase } = body;

    let command = "";
    let description = "";

    switch (action) {
      case "deploy":
        command = "npx prisma migrate deploy";
        description = "Deploy pending migrations";
        break;
      case "deploy-selective":
        if (!migrationName) {
          return errorResponse("Migration name is required for selective deployment", 400);
        }
        // For selective deployment, we need to use a different approach
        // Since Prisma doesn't support selective deployment directly,
        // we'll execute the specific migration SQL
        command = `npx prisma db execute --file prisma/migrations/${migrationName}/migration.sql`;
        description = `Deploy specific migration: ${migrationName}`;
        break;
      case "deploy-to-production":
        if (!targetDatabase) {
          return errorResponse("Target database URL is required", 400);
        }
        command = `DATABASE_URL="${targetDatabase}" npx prisma migrate deploy`;
        description = "Deploy migrations to production database";
        break;
      case "status":
        command = "npx prisma migrate status";
        description = "Check migration status";
        break;
      case "generate":
        command = "npx prisma generate";
        description = "Generate Prisma client";
        break;
      case "reset":
        command = "npx prisma migrate reset --force";
        description = "Reset database and apply all migrations (DANGEROUS)";
        break;
      default:
        return errorResponse(
          "Invalid action. Supported: deploy, deploy-selective, deploy-to-production, status, generate, reset",
          400
        );
    }

    console.log(
      `🔧 Admin ${session.user?.name} (${session.user?.id}) executing: ${command}`
    );

    const startTime = Date.now();
    let stdout = "";
    let stderr = "";

    try {
      const result = await execAsync(command);
      stdout = result.stdout;
      stderr = result.stderr;
    } catch (error: any) {
      // Some migration commands return non-zero exit codes even on success
      // (e.g., when there are pending migrations to apply)
      stdout = error.stdout || "";
      stderr = error.stderr || "";

      // Only throw if there's no useful output
      if (!stdout && !stderr) {
        throw error;
      }
    }

    const duration = Date.now() - startTime;

    console.log(`✅ Migration command completed in ${duration}ms`);

    // Log the migration execution
    const logEntry = {
      action,
      description,
      command,
      duration,
      output: stdout,
      error: stderr || null,
      success: !stderr || stderr.trim() === "",
      executedBy: {
        id: session.user?.id,
        name: session.user?.name,
        role: session.user?.role,
      },
      executedAt: new Date().toISOString(),
      migrationName: migrationName || null,
      targetDatabase: targetDatabase ? "production" : "development",
    };

    // Log to console for server logs
    console.log("🔄 Migration Execution Log:", JSON.stringify(logEntry, null, 2));

    return successResponse(logEntry);
  } catch (error: any) {
    console.error("Error executing migration command:", error);
    return errorResponse(`Migration failed: ${error.message}`, 500);
  }
}
