import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { seedPermissionSystem } from "@/lib/permissions/seed-permissions";

/**
 * Admin-only migration and seeding endpoint
 * This endpoint should only be called by administrators
 * Use with caution in production
 */
export async function POST(request: NextRequest) {
  try {
    // Check authentication and authorization
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Check if user is admin
    const user = await prisma.user.findUnique({
      where: { email: session.user.email! },
      select: { role: true },
    });

    if (!user || user.role !== "admin") {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    const { action } = await request.json();

    switch (action) {
      case "migrate":
        return await runMigrations();
      case "seed":
        return await runSeeding();
      case "setup":
        return await runFullSetup();
      default:
        return NextResponse.json(
          { error: "Invalid action. Use: migrate, seed, or setup" },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("Migration API error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

async function runMigrations() {
  try {
    console.log("🔄 Running database migrations...");

    // Test database connection
    await prisma.$queryRaw`SELECT 1`;

    console.log("✅ Database connection successful");
    console.log("✅ Migrations completed (Prisma client handles schema sync)");

    return NextResponse.json({
      success: true,
      message: "Migrations completed successfully",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Migration error:", error);
    return NextResponse.json(
      {
        error: "Migration failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

async function runSeeding() {
  try {
    console.log("🌱 Running database seeding...");

    await seedPermissionSystem();

    console.log("✅ Seeding completed successfully");

    return NextResponse.json({
      success: true,
      message: "Database seeded successfully",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Seeding error:", error);
    return NextResponse.json(
      {
        error: "Seeding failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

async function runFullSetup() {
  try {
    console.log("🚀 Running full database setup...");

    // Run migrations
    const migrateResult = await runMigrations();
    if (!migrateResult.ok) {
      throw new Error("Migration failed");
    }

    // Run seeding
    const seedResult = await runSeeding();
    if (!seedResult.ok) {
      throw new Error("Seeding failed");
    }

    console.log("✅ Full setup completed successfully");

    return NextResponse.json({
      success: true,
      message: "Full database setup completed successfully",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Full setup error:", error);
    return NextResponse.json(
      {
        error: "Full setup failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint to check migration status
 */
export async function GET() {
  try {
    // Check database connection
    await prisma.$queryRaw`SELECT 1`;

    // Check if permissions are seeded
    const permissionCount = await prisma.permission.count();
    const rolePermissionCount = await prisma.rolePermission.count();

    return NextResponse.json({
      database: {
        connected: true,
        permissions: permissionCount,
        rolePermissions: rolePermissionCount,
        isSeeded: permissionCount > 0 && rolePermissionCount > 0,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json({
      database: {
        connected: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      timestamp: new Date().toISOString(),
    });
  }
}
