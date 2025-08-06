/**
 * Permission System Seed Script
 * Seeds the database with initial permissions and role permissions
 */

import { prisma } from "@/lib/prisma";
import {
  PERMISSIONS,
  ROLE_PERMISSIONS,
  PERMISSION_CATEGORIES,
} from "./permission-matrix";

/**
 * Seed permissions table with all defined permissions
 */
async function seedPermissions() {
  console.log("🌱 Seeding permissions...");

  const permissions = Object.entries(PERMISSIONS).map(([name, description]) => {
    const category = name.split(".")[0];
    return {
      name,
      description,
      category:
        PERMISSION_CATEGORIES[category as keyof typeof PERMISSION_CATEGORIES] ||
        category,
    };
  });

  // Use upsert to avoid conflicts
  for (const permission of permissions) {
    await prisma.permission.upsert({
      where: { name: permission.name },
      update: {
        description: permission.description,
        category: permission.category,
      },
      create: permission,
    });
  }

  console.log(`✅ Seeded ${permissions.length} permissions`);
}

/**
 * Seed role permissions based on the permission matrix
 */
async function seedRolePermissions() {
  console.log("🌱 Seeding role permissions...");

  let totalRolePermissions = 0;

  for (const [role, permissionNames] of Object.entries(ROLE_PERMISSIONS)) {
    console.log(`  📝 Processing role: ${role}`);

    for (const permissionName of permissionNames) {
      // Get permission record
      const permission = await prisma.permission.findUnique({
        where: { name: permissionName },
      });

      if (!permission) {
        console.warn(`    ⚠️  Permission not found: ${permissionName}`);
        continue;
      }

      // Upsert role permission
      await prisma.rolePermission.upsert({
        where: {
          role_permissionId: {
            role,
            permissionId: permission.id,
          },
        },
        update: {
          granted: true,
        },
        create: {
          role,
          permissionId: permission.id,
          granted: true,
        },
      });

      totalRolePermissions++;
    }
  }

  console.log(`✅ Seeded ${totalRolePermissions} role permissions`);
}

/**
 * Create resource ownership records for existing data
 */
async function seedResourceOwnership() {
  console.log("🌱 Seeding resource ownership...");

  let totalOwnership = 0;

  // Leads ownership
  const leads = await prisma.lead.findMany({
    select: { id: true, createdBy: true, assign: true },
  });

  for (const lead of leads) {
    // Creator ownership
    if (lead.createdBy) {
      await prisma.resourceOwnership.upsert({
        where: {
          resourceType_resourceId: {
            resourceType: "lead",
            resourceId: lead.id,
          },
        },
        update: {
          ownerId: lead.createdBy,
        },
        create: {
          resourceType: "lead",
          resourceId: lead.id,
          ownerId: lead.createdBy,
        },
      });
      totalOwnership++;
    }
  }

  // Meetings ownership
  const meetings = await prisma.meeting.findMany({
    select: { id: true, createdBy: true },
  });

  for (const meeting of meetings) {
    if (meeting.createdBy) {
      await prisma.resourceOwnership.upsert({
        where: {
          resourceType_resourceId: {
            resourceType: "meeting",
            resourceId: meeting.id,
          },
        },
        update: {
          ownerId: meeting.createdBy,
        },
        create: {
          resourceType: "meeting",
          resourceId: meeting.id,
          ownerId: meeting.createdBy,
        },
      });
      totalOwnership++;
    }
  }

  // Tasks ownership
  const tasks = await prisma.task.findMany({
    select: { id: true, createdBy: true, assignedTo: true },
  });

  for (const task of tasks) {
    if (task.createdBy) {
      await prisma.resourceOwnership.upsert({
        where: {
          resourceType_resourceId: {
            resourceType: "task",
            resourceId: task.id,
          },
        },
        update: {
          ownerId: task.createdBy,
        },
        create: {
          resourceType: "task",
          resourceId: task.id,
          ownerId: task.createdBy,
        },
      });
      totalOwnership++;
    }
  }

  // Notes ownership
  const notes = await prisma.note.findMany({
    select: { id: true, createdBy: true },
  });

  for (const note of notes) {
    if (note.createdBy) {
      await prisma.resourceOwnership.upsert({
        where: {
          resourceType_resourceId: {
            resourceType: "note",
            resourceId: note.id,
          },
        },
        update: {
          ownerId: note.createdBy,
        },
        create: {
          resourceType: "note",
          resourceId: note.id,
          ownerId: note.createdBy,
        },
      });
      totalOwnership++;
    }
  }

  console.log(`✅ Seeded ${totalOwnership} resource ownership records`);
}

/**
 * Main seed function
 */
export async function seedPermissionSystem(): Promise<void> {
  try {
    console.log("🚀 Starting permission system seed...");

    await seedPermissions();
    await seedRolePermissions();
    await seedResourceOwnership();

    console.log("🎉 Permission system seeded successfully!");
  } catch (error) {
    console.error("❌ Error seeding permission system:", error);
    throw error;
  }
}

/**
 * Clean up function (for development/testing)
 */
export async function cleanPermissionSystem(): Promise<void> {
  try {
    console.log("🧹 Cleaning permission system...");

    await prisma.rolePermission.deleteMany();
    await prisma.userPermission.deleteMany();
    await prisma.resourceOwnership.deleteMany();
    await prisma.permissionAuditLog.deleteMany();
    await prisma.permission.deleteMany();

    console.log("✅ Permission system cleaned");
  } catch (error) {
    console.error("❌ Error cleaning permission system:", error);
    throw error;
  }
}

/**
 * Reset function (clean + seed)
 */
export async function resetPermissionSystem(): Promise<void> {
  await cleanPermissionSystem();
  await seedPermissionSystem();
}

// Allow direct execution
if (require.main === module) {
  seedPermissionSystem()
    .then(() => {
      console.log("✅ Permission system seeded successfully");
      process.exit(0);
    })
    .catch((error) => {
      console.error("❌ Failed to seed permission system:", error);
      process.exit(1);
    });
}
