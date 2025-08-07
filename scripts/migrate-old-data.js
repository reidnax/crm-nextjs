const { Client } = require("pg");
const { PrismaClient } = require("@prisma/client");
const fs = require("fs");
const path = require("path");

// Configuration
const OLD_DATABASE_URL = process.env.OLD_DATABASE_URL;

const NEW_DATABASE_URL = "process.env.DATABASE_URL";

async function migrateOldData() {
  const oldClient = new Client({
    connectionString: OLD_DATABASE_URL,
    ssl: {
      rejectUnauthorized: false,
    },
  });

  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: NEW_DATABASE_URL,
      },
    },
  });

  try {
    await oldClient.connect();
    console.log("Connected to old database successfully");

    await prisma.$connect();
    console.log("Connected to new database successfully");

    const migrationLog = {
      startTime: new Date().toISOString(),
      tables: {},
      errors: [],
      summary: {
        totalRecords: 0,
        successfulMigrations: 0,
        failedMigrations: 0,
      },
    };

    // 1. Migrate Users
    console.log("\n🔄 Migrating Users...");
    await migrateUsers(oldClient, prisma, migrationLog);

    // 2. Migrate Leads
    console.log("\n🔄 Migrating Leads...");
    await migrateLeads(oldClient, prisma, migrationLog);

    // 3. Migrate Meetings
    console.log("\n🔄 Migrating Meetings...");
    await migrateMeetings(oldClient, prisma, migrationLog);

    // 4. Migrate Tasks
    console.log("\n🔄 Migrating Tasks...");
    await migrateTasks(oldClient, prisma, migrationLog);

    // 5. Migrate Notes
    console.log("\n🔄 Migrating Notes...");
    await migrateNotes(oldClient, prisma, migrationLog);

    // 6. Migrate Messages (if needed)
    console.log("\n🔄 Migrating Messages...");
    await migrateMessages(oldClient, prisma, migrationLog);

    // Save migration log
    const logPath = path.join(__dirname, "migration-log.json");
    fs.writeFileSync(logPath, JSON.stringify(migrationLog, null, 2));

    console.log("\n✅ Migration completed!");
    console.log(`📊 Summary:`);
    console.log(
      `   Total records processed: ${migrationLog.summary.totalRecords}`
    );
    console.log(
      `   Successful migrations: ${migrationLog.summary.successfulMigrations}`
    );
    console.log(
      `   Failed migrations: ${migrationLog.summary.failedMigrations}`
    );
    console.log(`📝 Detailed log saved to: ${logPath}`);
  } catch (error) {
    console.error("❌ Migration failed:", error);
  } finally {
    await oldClient.end();
    await prisma.$disconnect();
  }
}

async function migrateUsers(oldClient, prisma, migrationLog) {
  try {
    const users = await oldClient.query('SELECT * FROM "Users"');
    console.log(`Found ${users.rows.length} users to migrate`);

    let successCount = 0;
    let errorCount = 0;

    for (const user of users.rows) {
      try {
        // Check if user already exists
        const existingUser = await prisma.user.findUnique({
          where: { email: user.email },
        });

        if (existingUser) {
          console.log(`User ${user.email} already exists, skipping...`);
          continue;
        }

        // Map old user data to new schema
        const userData = {
          username:
            user.username || user.email?.split("@")[0] || `user_${user.id}`,
          password: user.password || "default_password_123", // You might want to handle this differently
          name: user.name,
          role: user.role || "User",
          phone: user.phone,
          email: user.email,
          website: user.website,
          active: user.active !== false, // Default to true if not specified
          // New fields will have default values
          avatar: null,
          department: null,
          jobTitle: null,
          bio: null,
          timezone: null,
          lastLoginAt: null,
          preferences: null,
          managerId: null,
          createdAt: user.createdAt || new Date(),
          updatedAt: user.updatedAt || new Date(),
        };

        await prisma.user.create({
          data: userData,
        });

        successCount++;
        console.log(`✅ Migrated user: ${user.email}`);
      } catch (error) {
        errorCount++;
        console.error(
          `❌ Failed to migrate user ${user.email}:`,
          error.message
        );
        migrationLog.errors.push({
          table: "Users",
          record: user,
          error: error.message,
        });
      }
    }

    migrationLog.tables.Users = { successCount, errorCount };
    migrationLog.summary.successfulMigrations += successCount;
    migrationLog.summary.failedMigrations += errorCount;
    migrationLog.summary.totalRecords += users.rows.length;
  } catch (error) {
    console.error("❌ Error migrating users:", error);
    migrationLog.errors.push({
      table: "Users",
      error: error.message,
    });
  }
}

async function migrateLeads(oldClient, prisma, migrationLog) {
  try {
    const leads = await oldClient.query('SELECT * FROM "Leads"');
    console.log(`Found ${leads.rows.length} leads to migrate`);

    let successCount = 0;
    let errorCount = 0;

    for (const lead of leads.rows) {
      try {
        // Check if lead already exists
        const existingLead = await prisma.lead.findFirst({
          where: {
            email: lead.email,
            name: lead.name,
          },
        });

        if (existingLead) {
          console.log(
            `Lead ${lead.name} (${lead.email}) already exists, skipping...`
          );
          continue;
        }

        // Map old lead data to new schema
        const leadData = {
          name: lead.name,
          email: lead.email,
          phone: lead.phone,
          alternatePhone: lead.alternatePhone,
          company: lead.company,
          businessCategory: lead.businessCategory,
          businessIndustry: lead.businessIndustry,
          status: lead.status || "New",
          subStatus: lead.subStatus,
          convertedStatus: lead.convertedStatus,
          state: lead.state,
          address: lead.address,
          pincode: lead.pincode,
          annualRevenue: lead.annualRevenue
            ? parseFloat(lead.annualRevenue)
            : null,
          investmentLimit: lead.investmentLimit
            ? parseFloat(lead.investmentLimit)
            : null,
          designation: lead.designation,
          city: lead.city,
          description: lead.description,
          website: lead.website,
          dealer: lead.dealer,
          createdBy: lead.createdBy,
          assign: lead.assign,
          // New fields with defaults
          priority: "Medium",
          source: null,
          tags: [],
          socialMedia: null,
          lastContactDate: null,
          nextFollowUpDate: null,
          leadScore: 0,
          isArchived: false,
          customFields: null,
          createdAt: lead.createdAt || new Date(),
          updatedAt: lead.updatedAt || new Date(),
        };

        await prisma.lead.create({
          data: leadData,
        });

        successCount++;
        console.log(`✅ Migrated lead: ${lead.name}`);
      } catch (error) {
        errorCount++;
        console.error(`❌ Failed to migrate lead ${lead.name}:`, error.message);
        migrationLog.errors.push({
          table: "Leads",
          record: lead,
          error: error.message,
        });
      }
    }

    migrationLog.tables.Leads = { successCount, errorCount };
    migrationLog.summary.successfulMigrations += successCount;
    migrationLog.summary.failedMigrations += errorCount;
    migrationLog.summary.totalRecords += leads.rows.length;
  } catch (error) {
    console.error("❌ Error migrating leads:", error);
    migrationLog.errors.push({
      table: "Leads",
      error: error.message,
    });
  }
}

async function migrateMeetings(oldClient, prisma, migrationLog) {
  try {
    const meetings = await oldClient.query('SELECT * FROM "Meetings"');
    console.log(`Found ${meetings.rows.length} meetings to migrate`);

    let successCount = 0;
    let errorCount = 0;

    for (const meeting of meetings.rows) {
      try {
        // Check if meeting already exists
        const existingMeeting = await prisma.meeting.findFirst({
          where: {
            subject: meeting.subject,
            startTime: meeting.startTime,
            leadId: meeting.leadId,
          },
        });

        if (existingMeeting) {
          console.log(`Meeting ${meeting.subject} already exists, skipping...`);
          continue;
        }

        // Map old meeting data to new schema
        const meetingData = {
          subject: meeting.subject,
          description: meeting.description,
          duration: meeting.duration,
          startTime: meeting.startTime,
          endTime: meeting.endTime,
          leadId: meeting.leadId,
          createdBy: meeting.createdBy,
          // New fields with defaults
          status: "Scheduled",
          type: "Meeting",
          location: null,
          agenda: null,
          outcome: null,
          priority: "Medium",
          attendees: null,
          isRecurring: false,
          parentId: null,
          reminderSent: false,
          createdAt: meeting.createdAt || new Date(),
          updatedAt: meeting.updatedAt || new Date(),
        };

        await prisma.meeting.create({
          data: meetingData,
        });

        successCount++;
        console.log(`✅ Migrated meeting: ${meeting.subject}`);
      } catch (error) {
        errorCount++;
        console.error(
          `❌ Failed to migrate meeting ${meeting.subject}:`,
          error.message
        );
        migrationLog.errors.push({
          table: "Meetings",
          record: meeting,
          error: error.message,
        });
      }
    }

    migrationLog.tables.Meetings = { successCount, errorCount };
    migrationLog.summary.successfulMigrations += successCount;
    migrationLog.summary.failedMigrations += errorCount;
    migrationLog.summary.totalRecords += meetings.rows.length;
  } catch (error) {
    console.error("❌ Error migrating meetings:", error);
    migrationLog.errors.push({
      table: "Meetings",
      error: error.message,
    });
  }
}

async function migrateTasks(oldClient, prisma, migrationLog) {
  try {
    const tasks = await oldClient.query('SELECT * FROM "Tasks"');
    console.log(`Found ${tasks.rows.length} tasks to migrate`);

    let successCount = 0;
    let errorCount = 0;

    for (const task of tasks.rows) {
      try {
        // Check if task already exists
        const existingTask = await prisma.task.findFirst({
          where: {
            subject: task.subject,
            dueDate: task.dueDate,
            leadId: task.leadId,
          },
        });

        if (existingTask) {
          console.log(`Task ${task.subject} already exists, skipping...`);
          continue;
        }

        // Map old task data to new schema
        const taskData = {
          subject: task.subject,
          description: task.description,
          dueDate: task.dueDate,
          leadId: task.leadId,
          createdBy: task.createdBy,
          // New fields with defaults
          status: "Pending",
          priority: "Medium",
          category: null,
          estimatedHours: null,
          actualHours: null,
          completedAt: null,
          tags: [],
          isRecurring: false,
          parentId: null,
          assignedTo: task.createdBy, // Default to creator
          reminderDate: null,
          createdAt: task.createdAt || new Date(),
          updatedAt: task.updatedAt || new Date(),
        };

        await prisma.task.create({
          data: taskData,
        });

        successCount++;
        console.log(`✅ Migrated task: ${task.subject}`);
      } catch (error) {
        errorCount++;
        console.error(
          `❌ Failed to migrate task ${task.subject}:`,
          error.message
        );
        migrationLog.errors.push({
          table: "Tasks",
          record: task,
          error: error.message,
        });
      }
    }

    migrationLog.tables.Tasks = { successCount, errorCount };
    migrationLog.summary.successfulMigrations += successCount;
    migrationLog.summary.failedMigrations += errorCount;
    migrationLog.summary.totalRecords += tasks.rows.length;
  } catch (error) {
    console.error("❌ Error migrating tasks:", error);
    migrationLog.errors.push({
      table: "Tasks",
      error: error.message,
    });
  }
}

async function migrateNotes(oldClient, prisma, migrationLog) {
  try {
    const notes = await oldClient.query('SELECT * FROM "Notes"');
    console.log(`Found ${notes.rows.length} notes to migrate`);

    let successCount = 0;
    let errorCount = 0;

    for (const note of notes.rows) {
      try {
        // Check if note already exists
        const existingNote = await prisma.note.findFirst({
          where: {
            subject: note.subject,
            leadId: note.leadId,
            createdAt: note.createdAt,
          },
        });

        if (existingNote) {
          console.log(`Note ${note.subject} already exists, skipping...`);
          continue;
        }

        // Map old note data to new schema
        const noteData = {
          subject: note.subject,
          description: note.description,
          leadId: note.leadId,
          createdBy: note.createdBy,
          // New fields with defaults
          type: "General",
          category: null,
          tags: [],
          isPrivate: false,
          isPinned: false,
          attachments: null,
          mentions: [],
          createdAt: note.createdAt || new Date(),
          updatedAt: note.updatedAt || new Date(),
        };

        await prisma.note.create({
          data: noteData,
        });

        successCount++;
        console.log(`✅ Migrated note: ${note.subject}`);
      } catch (error) {
        errorCount++;
        console.error(
          `❌ Failed to migrate note ${note.subject}:`,
          error.message
        );
        migrationLog.errors.push({
          table: "Notes",
          record: note,
          error: error.message,
        });
      }
    }

    migrationLog.tables.Notes = { successCount, errorCount };
    migrationLog.summary.successfulMigrations += successCount;
    migrationLog.summary.failedMigrations += errorCount;
    migrationLog.summary.totalRecords += notes.rows.length;
  } catch (error) {
    console.error("❌ Error migrating notes:", error);
    migrationLog.errors.push({
      table: "Notes",
      error: error.message,
    });
  }
}

async function migrateMessages(oldClient, prisma, migrationLog) {
  try {
    const messages = await oldClient.query('SELECT * FROM "Messages"');
    console.log(`Found ${messages.rows.length} messages to migrate`);

    // Note: The new schema doesn't have a Messages table, so we'll log this
    console.log(
      "⚠️  Messages table not found in new schema - skipping migration"
    );
    migrationLog.tables.Messages = {
      successCount: 0,
      errorCount: 0,
      note: "Messages table not present in new schema",
    };
  } catch (error) {
    console.error("❌ Error checking messages:", error);
    migrationLog.errors.push({
      table: "Messages",
      error: error.message,
    });
  }
}

// Run the migration
if (require.main === module) {
  migrateOldData().catch(console.error);
}

module.exports = { migrateOldData };
