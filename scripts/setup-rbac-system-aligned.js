const { PrismaClient } = require("@prisma/client");
const fs = require("fs");
const path = require("path");

const prisma = new PrismaClient();

async function setupRBACSystemAligned() {
  try {
    console.log(
      "🔧 Setting up RBAC System (Aligned with existing permissions)..."
    );

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

    // Step 1: Create Permissions (using existing permission matrix)
    console.log("\n📋 Step 1: Creating Permissions...");
    await createPermissionsAligned(setupLog);

    // Step 2: Create Role Permissions
    console.log("\n👥 Step 2: Setting up Role Permissions...");
    await createRolePermissionsAligned(setupLog);

    // Step 3: Create User Permissions
    console.log("\n👤 Step 3: Skipping User Permissions...");
    // await createUserPermissionsAligned(setupLog);

    // Step 4: Create Resource Ownerships
    console.log("\n🏷️  Step 4: Setting up Resource Ownerships...");
    await createResourceOwnerships(setupLog);

    // Step 5: Create Initial Audit Logs
    console.log("\n📝 Step 5: Creating Initial Audit Logs...");
    await createInitialAuditLogs(setupLog);

    // Save setup log
    const logPath = path.join(__dirname, "rbac-setup-aligned-log.json");
    fs.writeFileSync(logPath, JSON.stringify(setupLog, null, 2));

    console.log("\n✅ RBAC System Setup Completed (Aligned)!");
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

async function createPermissionsAligned(setupLog) {
  try {
    // Use the same permissions as defined in permission-matrix.ts
    const permissions = [
      // User Management
      {
        name: "users.create",
        description: "Create new users",
        category: "users",
      },
      {
        name: "users.read.all",
        description: "View all users",
        category: "users",
      },
      {
        name: "users.read.own",
        description: "View own profile",
        category: "users",
      },
      {
        name: "users.read.department",
        description: "View department users",
        category: "users",
      },
      {
        name: "users.update.all",
        description: "Edit all users",
        category: "users",
      },
      {
        name: "users.update.own",
        description: "Edit own profile",
        category: "users",
      },
      {
        name: "users.update.department",
        description: "Edit department users",
        category: "users",
      },
      {
        name: "users.delete",
        description: "Deactivate users",
        category: "users",
      },
      {
        name: "users.manage.roles",
        description: "Change user roles",
        category: "users",
      },
      {
        name: "users.export",
        description: "Export user data",
        category: "users",
      },

      // Lead Management
      {
        name: "leads.create",
        description: "Create new leads",
        category: "leads",
      },
      {
        name: "leads.read.all",
        description: "View all leads",
        category: "leads",
      },
      {
        name: "leads.read.assigned",
        description: "View assigned leads",
        category: "leads",
      },
      {
        name: "leads.read.team",
        description: "View team leads",
        category: "leads",
      },
      {
        name: "leads.read.department",
        description: "View department leads",
        category: "leads",
      },
      {
        name: "leads.update.all",
        description: "Edit all leads",
        category: "leads",
      },
      {
        name: "leads.update.assigned",
        description: "Edit assigned leads",
        category: "leads",
      },
      {
        name: "leads.update.team",
        description: "Edit team leads",
        category: "leads",
      },
      {
        name: "leads.update.department",
        description: "Edit department leads",
        category: "leads",
      },
      {
        name: "leads.delete.all",
        description: "Delete any leads",
        category: "leads",
      },
      {
        name: "leads.delete.assigned",
        description: "Delete assigned leads",
        category: "leads",
      },
      {
        name: "leads.assign.all",
        description: "Assign leads to anyone",
        category: "leads",
      },
      {
        name: "leads.assign.team",
        description: "Assign leads within team",
        category: "leads",
      },
      {
        name: "leads.assign.department",
        description: "Assign leads within department",
        category: "leads",
      },
      {
        name: "leads.export.all",
        description: "Export all leads",
        category: "leads",
      },
      {
        name: "leads.export.assigned",
        description: "Export assigned leads",
        category: "leads",
      },
      {
        name: "leads.export.department",
        description: "Export department leads",
        category: "leads",
      },

      // Meeting Management
      {
        name: "meetings.create",
        description: "Create new meetings",
        category: "meetings",
      },
      {
        name: "meetings.read.all",
        description: "View all meetings",
        category: "meetings",
      },
      {
        name: "meetings.read.assigned",
        description: "View assigned meetings",
        category: "meetings",
      },
      {
        name: "meetings.read.department",
        description: "View department meetings",
        category: "meetings",
      },
      {
        name: "meetings.update.all",
        description: "Edit all meetings",
        category: "meetings",
      },
      {
        name: "meetings.update.assigned",
        description: "Edit assigned meetings",
        category: "meetings",
      },
      {
        name: "meetings.delete.all",
        description: "Delete any meetings",
        category: "meetings",
      },
      {
        name: "meetings.delete.assigned",
        description: "Delete assigned meetings",
        category: "meetings",
      },

      // Task Management
      {
        name: "tasks.create",
        description: "Create new tasks",
        category: "tasks",
      },
      {
        name: "tasks.read.all",
        description: "View all tasks",
        category: "tasks",
      },
      {
        name: "tasks.read.assigned",
        description: "View assigned tasks",
        category: "tasks",
      },
      {
        name: "tasks.read.department",
        description: "View department tasks",
        category: "tasks",
      },
      {
        name: "tasks.update.all",
        description: "Edit all tasks",
        category: "tasks",
      },
      {
        name: "tasks.update.assigned",
        description: "Edit assigned tasks",
        category: "tasks",
      },
      {
        name: "tasks.delete.all",
        description: "Delete any tasks",
        category: "tasks",
      },
      {
        name: "tasks.delete.assigned",
        description: "Delete assigned tasks",
        category: "tasks",
      },

      // Note Management
      {
        name: "notes.create",
        description: "Create new notes",
        category: "notes",
      },
      {
        name: "notes.read.all",
        description: "View all notes",
        category: "notes",
      },
      {
        name: "notes.read.assigned",
        description: "View assigned notes",
        category: "notes",
      },
      {
        name: "notes.read.department",
        description: "View department notes",
        category: "notes",
      },
      {
        name: "notes.update.all",
        description: "Edit all notes",
        category: "notes",
      },
      {
        name: "notes.update.assigned",
        description: "Edit assigned notes",
        category: "notes",
      },
      {
        name: "notes.delete.all",
        description: "Delete any notes",
        category: "notes",
      },
      {
        name: "notes.delete.assigned",
        description: "Delete assigned notes",
        category: "notes",
      },

      // Team Management
      {
        name: "team.read.all",
        description: "View all team members",
        category: "team",
      },
      {
        name: "team.read.department",
        description: "View department members",
        category: "team",
      },
      {
        name: "team.manage.all",
        description: "Manage all team members",
        category: "team",
      },
      {
        name: "team.manage.department",
        description: "Manage department members",
        category: "team",
      },
      {
        name: "team.export",
        description: "Export team data",
        category: "team",
      },

      // Data & Reports
      {
        name: "data.export.all",
        description: "Export all data",
        category: "data",
      },
      {
        name: "data.export.department",
        description: "Export department data",
        category: "data",
      },
      {
        name: "data.export.assigned",
        description: "Export assigned data",
        category: "data",
      },
      {
        name: "reports.view.all",
        description: "View all reports",
        category: "reports",
      },
      {
        name: "reports.view.department",
        description: "View department reports",
        category: "reports",
      },
      {
        name: "reports.view.personal",
        description: "View personal reports",
        category: "reports",
      },
      {
        name: "reports.create",
        description: "Create custom reports",
        category: "reports",
      },

      // System Settings
      {
        name: "settings.system",
        description: "Manage system settings",
        category: "settings",
      },
      {
        name: "settings.integrations",
        description: "Manage integrations",
        category: "settings",
      },
      {
        name: "settings.security",
        description: "Manage security settings",
        category: "settings",
      },
      {
        name: "settings.notifications",
        description: "Manage notification settings",
        category: "settings",
      },

      // Dashboard
      {
        name: "dashboard.view.all",
        description: "View company dashboard",
        category: "dashboard",
      },
      {
        name: "dashboard.view.department",
        description: "View department dashboard",
        category: "dashboard",
      },
      {
        name: "dashboard.view.personal",
        description: "View personal dashboard",
        category: "dashboard",
      },

      // Audit & Admin
      { name: "audit.view", description: "View audit logs", category: "audit" },
      {
        name: "permissions.manage",
        description: "Manage user permissions",
        category: "permissions",
      },
      {
        name: "permissions.view",
        description: "View permission assignments",
        category: "permissions",
      },
    ];

    let createdCount = 0;
    for (const permission of permissions) {
      try {
        await prisma.permission.upsert({
          where: { name: permission.name },
          update: {
            description: permission.description,
            category: permission.category,
          },
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
          step: "createPermissionsAligned",
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
      step: "createPermissionsAligned",
      error: error.message,
    });
  }
}

async function createRolePermissionsAligned(setupLog) {
  try {
    // Use the same role permissions as defined in permission-matrix.ts
    const rolePermissions = [
      {
        role: "Admin",
        permissions: [
          // Full access to everything (all permissions)
          "users.create",
          "users.read.all",
          "users.read.own",
          "users.read.department",
          "users.update.all",
          "users.update.own",
          "users.update.department",
          "users.delete",
          "users.manage.roles",
          "users.export",
          "leads.create",
          "leads.read.all",
          "leads.read.assigned",
          "leads.read.team",
          "leads.read.department",
          "leads.update.all",
          "leads.update.assigned",
          "leads.update.team",
          "leads.update.department",
          "leads.delete.all",
          "leads.delete.assigned",
          "leads.assign.all",
          "leads.assign.team",
          "leads.assign.department",
          "leads.export.all",
          "leads.export.assigned",
          "leads.export.department",
          "meetings.create",
          "meetings.read.all",
          "meetings.read.assigned",
          "meetings.read.department",
          "meetings.update.all",
          "meetings.update.assigned",
          "meetings.delete.all",
          "meetings.delete.assigned",
          "tasks.create",
          "tasks.read.all",
          "tasks.read.assigned",
          "tasks.read.department",
          "tasks.update.all",
          "tasks.update.assigned",
          "tasks.delete.all",
          "tasks.delete.assigned",
          "notes.create",
          "notes.read.all",
          "notes.read.assigned",
          "notes.read.department",
          "notes.update.all",
          "notes.update.assigned",
          "notes.delete.all",
          "notes.delete.assigned",
          "team.read.all",
          "team.read.department",
          "team.manage.all",
          "team.manage.department",
          "team.export",
          "data.export.all",
          "data.export.department",
          "data.export.assigned",
          "reports.view.all",
          "reports.view.department",
          "reports.view.personal",
          "reports.create",
          "settings.system",
          "settings.integrations",
          "settings.security",
          "settings.notifications",
          "dashboard.view.all",
          "dashboard.view.department",
          "dashboard.view.personal",
          "audit.view",
          "permissions.manage",
          "permissions.view",
        ],
      },

      {
        role: "Admin-Dev",
        permissions: [
          // Same as Admin - full access
          "users.create",
          "users.read.all",
          "users.read.own",
          "users.read.department",
          "users.update.all",
          "users.update.own",
          "users.update.department",
          "users.delete",
          "users.manage.roles",
          "users.export",
          "leads.create",
          "leads.read.all",
          "leads.read.assigned",
          "leads.read.team",
          "leads.read.department",
          "leads.update.all",
          "leads.update.assigned",
          "leads.update.team",
          "leads.update.department",
          "leads.delete.all",
          "leads.delete.assigned",
          "leads.assign.all",
          "leads.assign.team",
          "leads.assign.department",
          "leads.export.all",
          "leads.export.assigned",
          "leads.export.department",
          "meetings.create",
          "meetings.read.all",
          "meetings.read.assigned",
          "meetings.read.department",
          "meetings.update.all",
          "meetings.update.assigned",
          "meetings.delete.all",
          "meetings.delete.assigned",
          "tasks.create",
          "tasks.read.all",
          "tasks.read.assigned",
          "tasks.read.department",
          "tasks.update.all",
          "tasks.update.assigned",
          "tasks.delete.all",
          "tasks.delete.assigned",
          "notes.create",
          "notes.read.all",
          "notes.read.assigned",
          "notes.read.department",
          "notes.update.all",
          "notes.update.assigned",
          "notes.delete.all",
          "notes.delete.assigned",
          "team.read.all",
          "team.read.department",
          "team.manage.all",
          "team.manage.department",
          "team.export",
          "data.export.all",
          "data.export.department",
          "data.export.assigned",
          "reports.view.all",
          "reports.view.department",
          "reports.view.personal",
          "reports.create",
          "settings.system",
          "settings.integrations",
          "settings.security",
          "settings.notifications",
          "dashboard.view.all",
          "dashboard.view.department",
          "dashboard.view.personal",
          "audit.view",
          "permissions.manage",
          "permissions.view",
        ],
      },

      {
        role: "Manager",
        permissions: [
          // User management (department scope)
          "users.read.all",
          "users.read.department",
          "users.update.own",
          "users.update.department",
          "users.export",
          // Lead management (department scope)
          "leads.create",
          "leads.read.all",
          "leads.read.department",
          "leads.update.all",
          "leads.update.department",
          "leads.assign.all",
          "leads.assign.department",
          "leads.export.all",
          "leads.export.department",
          // Meeting management (department scope)
          "meetings.create",
          "meetings.read.all",
          "meetings.read.department",
          "meetings.update.all",
          "meetings.delete.assigned",
          // Task management (department scope)
          "tasks.create",
          "tasks.read.all",
          "tasks.read.department",
          "tasks.update.all",
          "tasks.delete.assigned",
          // Note management (department scope)
          "notes.create",
          "notes.read.all",
          "notes.read.department",
          "notes.update.all",
          "notes.delete.assigned",
          // Team management (department scope)
          "team.read.all",
          "team.read.department",
          "team.manage.department",
          "team.export",
          // Reports (department scope)
          "reports.view.all",
          "reports.view.department",
          "reports.create",
          "data.export.department",
          // Dashboard
          "dashboard.view.all",
          "dashboard.view.department",
          "dashboard.view.personal",
          // Limited permissions view
          "permissions.view",
        ],
      },

      {
        role: "Assignee",
        permissions: [
          // Basic user permissions
          "users.read.own",
          "users.update.own",
          // Lead management (assigned only)
          "leads.read.assigned",
          "leads.update.assigned",
          "leads.export.assigned",
          // Meeting management (assigned only)
          "meetings.create",
          "meetings.read.assigned",
          "meetings.update.assigned",
          "meetings.delete.assigned",
          // Task management (assigned only)
          "tasks.create",
          "tasks.read.assigned",
          "tasks.update.assigned",
          "tasks.delete.assigned",
          // Note management (assigned only)
          "notes.create",
          "notes.read.assigned",
          "notes.update.assigned",
          "notes.delete.assigned",
          // Basic reporting
          "reports.view.personal",
          "data.export.assigned",
          // Personal dashboard
          "dashboard.view.personal",
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
              update: {
                granted: true,
              },
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
            step: "createRolePermissionsAligned",
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
      step: "createRolePermissionsAligned",
      error: error.message,
    });
  }
}

async function createUserPermissionsAligned(setupLog) {
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
            update: {
              granted: rolePermission.granted,
            },
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
          step: "createUserPermissionsAligned",
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
      step: "createUserPermissionsAligned",
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
            update: {
              ownerId: lead.createdBy,
            },
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
            update: {
              ownerId: meeting.createdBy,
            },
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
            update: {
              ownerId: task.createdBy,
            },
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
            update: {
              ownerId: note.createdBy,
            },
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
      where: { role: "Admin-Dev" },
    });

    if (adminUser) {
      try {
        await prisma.permissionAuditLog.create({
          data: {
            userId: adminUser.id,
            action: "system_setup",
            permission: "permissions.manage",
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
  setupRBACSystemAligned().catch(console.error);
}

module.exports = { setupRBACSystemAligned };
