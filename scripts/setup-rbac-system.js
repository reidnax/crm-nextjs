const { PrismaClient } = require("@prisma/client");
const fs = require("fs");
const path = require("path");

const prisma = new PrismaClient();

async function setupRBACSystem() {
  try {
    console.log("🔧 Setting up RBAC System and Additional Tables...");

    const setupLog = {
      startTime: new Date().toISOString(),
      steps: {},
      errors: [],
      summary: {
        permissionsCreated: 0,
        rolePermissionsCreated: 0,
        userPermissionsCreated: 0,
        resourceOwnershipsCreated: 0,
        auditLogsCreated: 0,
      },
    };

    // Step 1: Create Permissions
    console.log("\n📋 Step 1: Creating Permissions...");
    await createPermissions(setupLog);

    // Step 2: Create Role Permissions
    console.log("\n👥 Step 2: Setting up Role Permissions...");
    await createRolePermissions(setupLog);

    // Step 3: Create User Permissions
    console.log("\n👤 Step 3: Setting up User Permissions...");
    await createUserPermissions(setupLog);

    // Step 4: Create Resource Ownerships
    console.log("\n🏷️  Step 4: Setting up Resource Ownerships...");
    await createResourceOwnerships(setupLog);

    // Step 5: Create Initial Audit Logs
    console.log("\n📝 Step 5: Creating Initial Audit Logs...");
    await createInitialAuditLogs(setupLog);

    // Save setup log
    const logPath = path.join(__dirname, "rbac-setup-log.json");
    fs.writeFileSync(logPath, JSON.stringify(setupLog, null, 2));

    console.log("\n✅ RBAC System Setup Completed!");
    console.log(`📊 Summary:`);
    console.log(
      `   Permissions created: ${setupLog.summary.permissionsCreated}`
    );
    console.log(
      `   Role permissions created: ${setupLog.summary.rolePermissionsCreated}`
    );
    console.log(
      `   User permissions created: ${setupLog.summary.userPermissionsCreated}`
    );
    console.log(
      `   Resource ownerships created: ${setupLog.summary.resourceOwnershipsCreated}`
    );
    console.log(`   Audit logs created: ${setupLog.summary.auditLogsCreated}`);
    console.log(`📝 Detailed log saved to: ${logPath}`);
  } catch (error) {
    console.error("❌ RBAC Setup failed:", error);
  } finally {
    await prisma.$disconnect();
  }
}

async function createPermissions(setupLog) {
  try {
    const permissions = [
      // Lead permissions
      { name: "leads.read", description: "Read leads", category: "leads" },
      { name: "leads.create", description: "Create leads", category: "leads" },
      { name: "leads.update", description: "Update leads", category: "leads" },
      { name: "leads.delete", description: "Delete leads", category: "leads" },
      {
        name: "leads.read.all",
        description: "Read all leads",
        category: "leads",
      },
      {
        name: "leads.update.all",
        description: "Update all leads",
        category: "leads",
      },
      {
        name: "leads.delete.all",
        description: "Delete all leads",
        category: "leads",
      },

      // Meeting permissions
      {
        name: "meetings.read",
        description: "Read meetings",
        category: "meetings",
      },
      {
        name: "meetings.create",
        description: "Create meetings",
        category: "meetings",
      },
      {
        name: "meetings.update",
        description: "Update meetings",
        category: "meetings",
      },
      {
        name: "meetings.delete",
        description: "Delete meetings",
        category: "meetings",
      },
      {
        name: "meetings.read.all",
        description: "Read all meetings",
        category: "meetings",
      },
      {
        name: "meetings.update.all",
        description: "Update all meetings",
        category: "meetings",
      },
      {
        name: "meetings.delete.all",
        description: "Delete all meetings",
        category: "meetings",
      },

      // Task permissions
      { name: "tasks.read", description: "Read tasks", category: "tasks" },
      { name: "tasks.create", description: "Create tasks", category: "tasks" },
      { name: "tasks.update", description: "Update tasks", category: "tasks" },
      { name: "tasks.delete", description: "Delete tasks", category: "tasks" },
      {
        name: "tasks.read.all",
        description: "Read all tasks",
        category: "tasks",
      },
      {
        name: "tasks.update.all",
        description: "Update all tasks",
        category: "tasks",
      },
      {
        name: "tasks.delete.all",
        description: "Delete all tasks",
        category: "tasks",
      },

      // Note permissions
      { name: "notes.read", description: "Read notes", category: "notes" },
      { name: "notes.create", description: "Create notes", category: "notes" },
      { name: "notes.update", description: "Update notes", category: "notes" },
      { name: "notes.delete", description: "Delete notes", category: "notes" },
      {
        name: "notes.read.all",
        description: "Read all notes",
        category: "notes",
      },
      {
        name: "notes.update.all",
        description: "Update all notes",
        category: "notes",
      },
      {
        name: "notes.delete.all",
        description: "Delete all notes",
        category: "notes",
      },

      // User permissions
      { name: "users.read", description: "Read users", category: "users" },
      { name: "users.create", description: "Create users", category: "users" },
      { name: "users.update", description: "Update users", category: "users" },
      { name: "users.delete", description: "Delete users", category: "users" },
      {
        name: "users.read.all",
        description: "Read all users",
        category: "users",
      },
      {
        name: "users.update.all",
        description: "Update all users",
        category: "users",
      },
      {
        name: "users.delete.all",
        description: "Delete all users",
        category: "users",
      },

      // Permission management
      {
        name: "permissions.manage",
        description: "Manage permissions",
        category: "permissions",
      },
      {
        name: "roles.manage",
        description: "Manage roles",
        category: "permissions",
      },

      // Reports and analytics
      {
        name: "reports.read",
        description: "Read reports",
        category: "reports",
      },
      {
        name: "reports.create",
        description: "Create reports",
        category: "reports",
      },
      {
        name: "analytics.read",
        description: "Read analytics",
        category: "reports",
      },

      // System permissions
      {
        name: "system.admin",
        description: "Full system access",
        category: "system",
      },
      {
        name: "audit.read",
        description: "Read audit logs",
        category: "system",
      },
    ];

    let createdCount = 0;
    for (const permission of permissions) {
      try {
        await prisma.permission.upsert({
          where: { name: permission.name },
          update: {},
          create: permission,
        });
        createdCount++;
        console.log(`✅ Created permission: ${permission.name}`);
      } catch (error) {
        console.error(
          `❌ Failed to create permission ${permission.name}:`,
          error.message
        );
        setupLog.errors.push({
          step: "createPermissions",
          permission,
          error: error.message,
        });
      }
    }

    setupLog.summary.permissionsCreated = createdCount;
    setupLog.steps.permissions = {
      created: createdCount,
      total: permissions.length,
    };
  } catch (error) {
    console.error("❌ Error creating permissions:", error);
    setupLog.errors.push({
      step: "createPermissions",
      error: error.message,
    });
  }
}

async function createRolePermissions(setupLog) {
  try {
    const rolePermissions = [
      // Admin role - full access
      {
        role: "Admin",
        permissions: [
          "leads.read.all",
          "leads.create",
          "leads.update.all",
          "leads.delete.all",
          "meetings.read.all",
          "meetings.create",
          "meetings.update.all",
          "meetings.delete.all",
          "tasks.read.all",
          "tasks.create",
          "tasks.update.all",
          "tasks.delete.all",
          "notes.read.all",
          "notes.create",
          "notes.update.all",
          "notes.delete.all",
          "users.read.all",
          "users.create",
          "users.update.all",
          "users.delete.all",
          "permissions.manage",
          "roles.manage",
          "reports.read",
          "reports.create",
          "analytics.read",
          "system.admin",
          "audit.read",
        ],
      },

      // Manager role - team management
      {
        role: "Manager",
        permissions: [
          "leads.read.all",
          "leads.create",
          "leads.update.all",
          "leads.delete.all",
          "meetings.read.all",
          "meetings.create",
          "meetings.update.all",
          "meetings.delete.all",
          "tasks.read.all",
          "tasks.create",
          "tasks.update.all",
          "tasks.delete.all",
          "notes.read.all",
          "notes.create",
          "notes.update.all",
          "notes.delete.all",
          "users.read",
          "users.create",
          "users.update",
          "reports.read",
          "analytics.read",
        ],
      },

      // Assignee role - basic access
      {
        role: "Assignee",
        permissions: [
          "leads.read",
          "leads.create",
          "leads.update",
          "leads.delete",
          "meetings.read",
          "meetings.create",
          "meetings.update",
          "meetings.delete",
          "tasks.read",
          "tasks.create",
          "tasks.update",
          "tasks.delete",
          "notes.read",
          "notes.create",
          "notes.update",
          "notes.delete",
        ],
      },

      // Viewer role - read-only access
      {
        role: "Viewer",
        permissions: [
          "leads.read",
          "meetings.read",
          "tasks.read",
          "notes.read",
          "reports.read",
        ],
      },
    ];

    let createdCount = 0;
    for (const roleConfig of rolePermissions) {
      for (const permissionName of roleConfig.permissions) {
        try {
          const permission = await prisma.permission.findUnique({
            where: { name: permissionName },
          });

          if (permission) {
            await prisma.rolePermission.upsert({
              where: {
                role_permissionId: {
                  role: roleConfig.role,
                  permissionId: permission.id,
                },
              },
              update: {},
              create: {
                role: roleConfig.role,
                permissionId: permission.id,
                granted: true,
              },
            });
            createdCount++;
          }
        } catch (error) {
          console.error(
            `❌ Failed to create role permission ${roleConfig.role}:${permissionName}:`,
            error.message
          );
          setupLog.errors.push({
            step: "createRolePermissions",
            role: roleConfig.role,
            permission: permissionName,
            error: error.message,
          });
        }
      }
    }

    setupLog.summary.rolePermissionsCreated = createdCount;
    setupLog.steps.rolePermissions = { created: createdCount };
  } catch (error) {
    console.error("❌ Error creating role permissions:", error);
    setupLog.errors.push({
      step: "createRolePermissions",
      error: error.message,
    });
  }
}

async function createUserPermissions(setupLog) {
  try {
    // Get all users
    const users = await prisma.user.findMany();
    console.log(`Found ${users.length} users to set up permissions for`);

    let createdCount = 0;
    for (const user of users) {
      try {
        // Determine user role based on existing role or default to Assignee
        const userRole = user.role || "Assignee";

        // Get role permissions for this user's role
        const rolePermissions = await prisma.rolePermission.findMany({
          where: { role: userRole },
          include: { permission: true },
        });

        // Create user permissions based on role
        for (const rolePermission of rolePermissions) {
          await prisma.userPermission.upsert({
            where: {
              userId_permissionId: {
                userId: user.id,
                permissionId: rolePermission.permissionId,
              },
            },
            update: {},
            create: {
              userId: user.id,
              permissionId: rolePermission.permissionId,
              granted: rolePermission.granted,
              grantedBy: null, // System setup
            },
          });
          createdCount++;
        }

        console.log(
          `✅ Set up permissions for user: ${user.email} (${userRole})`
        );
      } catch (error) {
        console.error(
          `❌ Failed to set up permissions for user ${user.email}:`,
          error.message
        );
        setupLog.errors.push({
          step: "createUserPermissions",
          user: user.email,
          error: error.message,
        });
      }
    }

    setupLog.summary.userPermissionsCreated = createdCount;
    setupLog.steps.userPermissions = {
      created: createdCount,
      users: users.length,
    };
  } catch (error) {
    console.error("❌ Error creating user permissions:", error);
    setupLog.errors.push({
      step: "createUserPermissions",
      error: error.message,
    });
  }
}

async function createResourceOwnerships(setupLog) {
  try {
    let createdCount = 0;

    // Create ownerships for leads
    const leads = await prisma.lead.findMany();
    for (const lead of leads) {
      if (lead.createdBy) {
        try {
          await prisma.resourceOwnership.upsert({
            where: {
              resourceType_resourceId: {
                resourceType: "lead",
                resourceId: lead.id,
              },
            },
            update: {},
            create: {
              resourceType: "lead",
              resourceId: lead.id,
              ownerId: lead.createdBy,
            },
          });
          createdCount++;
        } catch (error) {
          console.error(
            `❌ Failed to create lead ownership for lead ${lead.id}:`,
            error.message
          );
        }
      }
    }

    // Create ownerships for meetings
    const meetings = await prisma.meeting.findMany();
    for (const meeting of meetings) {
      if (meeting.createdBy) {
        try {
          await prisma.resourceOwnership.upsert({
            where: {
              resourceType_resourceId: {
                resourceType: "meeting",
                resourceId: meeting.id,
              },
            },
            update: {},
            create: {
              resourceType: "meeting",
              resourceId: meeting.id,
              ownerId: meeting.createdBy,
            },
          });
          createdCount++;
        } catch (error) {
          console.error(
            `❌ Failed to create meeting ownership for meeting ${meeting.id}:`,
            error.message
          );
        }
      }
    }

    // Create ownerships for tasks
    const tasks = await prisma.task.findMany();
    for (const task of tasks) {
      if (task.createdBy) {
        try {
          await prisma.resourceOwnership.upsert({
            where: {
              resourceType_resourceId: {
                resourceType: "task",
                resourceId: task.id,
              },
            },
            update: {},
            create: {
              resourceType: "task",
              resourceId: task.id,
              ownerId: task.createdBy,
            },
          });
          createdCount++;
        } catch (error) {
          console.error(
            `❌ Failed to create task ownership for task ${task.id}:`,
            error.message
          );
        }
      }
    }

    // Create ownerships for notes
    const notes = await prisma.note.findMany();
    for (const note of notes) {
      if (note.createdBy) {
        try {
          await prisma.resourceOwnership.upsert({
            where: {
              resourceType_resourceId: {
                resourceType: "note",
                resourceId: note.id,
              },
            },
            update: {},
            create: {
              resourceType: "note",
              resourceId: note.id,
              ownerId: note.createdBy,
            },
          });
          createdCount++;
        } catch (error) {
          console.error(
            `❌ Failed to create note ownership for note ${note.id}:`,
            error.message
          );
        }
      }
    }

    setupLog.summary.resourceOwnershipsCreated = createdCount;
    setupLog.steps.resourceOwnerships = { created: createdCount };
  } catch (error) {
    console.error("❌ Error creating resource ownerships:", error);
    setupLog.errors.push({
      step: "createResourceOwnerships",
      error: error.message,
    });
  }
}

async function createInitialAuditLogs(setupLog) {
  try {
    // Create initial audit log entry for system setup
    const adminUser = await prisma.user.findFirst({
      where: { role: "Admin" },
    });

    if (adminUser) {
      try {
        await prisma.permissionAuditLog.create({
          data: {
            userId: adminUser.id,
            action: "system_setup",
            permission: "system.admin",
            oldValue: null,
            newValue: { setup: "RBAC system initialized" },
            changedBy: adminUser.id,
            ipAddress: "127.0.0.1",
            userAgent: "System Setup Script",
          },
        });

        setupLog.summary.auditLogsCreated = 1;
        setupLog.steps.auditLogs = { created: 1 };
        console.log("✅ Created initial audit log entry");
      } catch (error) {
        console.error("❌ Failed to create initial audit log:", error.message);
        setupLog.errors.push({
          step: "createInitialAuditLogs",
          error: error.message,
        });
      }
    }
  } catch (error) {
    console.error("❌ Error creating initial audit logs:", error);
    setupLog.errors.push({
      step: "createInitialAuditLogs",
      error: error.message,
    });
  }
}

// Run the setup
if (require.main === module) {
  setupRBACSystem().catch(console.error);
}

module.exports = { setupRBACSystem };
