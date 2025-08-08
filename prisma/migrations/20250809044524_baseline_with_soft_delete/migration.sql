-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "public"."Users" (
    "id" SERIAL NOT NULL,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT,
    "role" TEXT,
    "phone" TEXT,
    "email" TEXT NOT NULL,
    "website" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "avatar" TEXT,
    "department" TEXT,
    "jobTitle" TEXT,
    "bio" TEXT,
    "timezone" TEXT,
    "lastLoginAt" TIMESTAMP(3),
    "preferences" JSONB,
    "managerId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Leads" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "alternatePhone" TEXT,
    "company" TEXT,
    "businessCategory" TEXT,
    "businessIndustry" TEXT,
    "status" TEXT,
    "subStatus" TEXT,
    "convertedStatus" TEXT,
    "state" TEXT,
    "address" TEXT,
    "pincode" TEXT,
    "annualRevenue" DECIMAL(65,30),
    "investmentLimit" DECIMAL(65,30),
    "designation" TEXT,
    "city" TEXT,
    "description" TEXT,
    "website" TEXT,
    "dealer" JSONB,
    "createdBy" INTEGER,
    "assign" INTEGER,
    "priority" TEXT DEFAULT 'Medium',
    "source" TEXT,
    "tags" TEXT[],
    "socialMedia" JSONB,
    "lastContactDate" TIMESTAMP(3),
    "nextFollowUpDate" TIMESTAMP(3),
    "leadScore" INTEGER DEFAULT 0,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "customFields" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Leads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Meetings" (
    "id" SERIAL NOT NULL,
    "subject" TEXT NOT NULL,
    "description" TEXT,
    "duration" INTEGER NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "leadId" INTEGER NOT NULL,
    "createdBy" INTEGER,
    "status" TEXT DEFAULT 'Scheduled',
    "type" TEXT DEFAULT 'Meeting',
    "location" TEXT,
    "agenda" TEXT,
    "outcome" TEXT,
    "priority" TEXT DEFAULT 'Medium',
    "attendees" JSONB,
    "isRecurring" BOOLEAN NOT NULL DEFAULT false,
    "parentId" INTEGER,
    "reminderSent" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Meetings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Tasks" (
    "id" SERIAL NOT NULL,
    "subject" TEXT NOT NULL,
    "description" TEXT,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "leadId" INTEGER NOT NULL,
    "createdBy" INTEGER,
    "status" TEXT DEFAULT 'Pending',
    "priority" TEXT DEFAULT 'Medium',
    "category" TEXT,
    "estimatedHours" DOUBLE PRECISION,
    "actualHours" DOUBLE PRECISION,
    "completedAt" TIMESTAMP(3),
    "tags" TEXT[],
    "isRecurring" BOOLEAN NOT NULL DEFAULT false,
    "parentId" INTEGER,
    "assignedTo" INTEGER,
    "reminderDate" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "deletedBy" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Notes" (
    "id" SERIAL NOT NULL,
    "subject" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "leadId" INTEGER NOT NULL,
    "createdBy" INTEGER,
    "type" TEXT DEFAULT 'General',
    "category" TEXT,
    "tags" TEXT[],
    "isPrivate" BOOLEAN NOT NULL DEFAULT false,
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "attachments" JSONB,
    "mentions" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Permissions" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."RolePermissions" (
    "id" SERIAL NOT NULL,
    "role" TEXT NOT NULL,
    "permissionId" INTEGER NOT NULL,
    "granted" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RolePermissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."UserPermissions" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "permissionId" INTEGER NOT NULL,
    "granted" BOOLEAN NOT NULL DEFAULT true,
    "grantedBy" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserPermissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PermissionAuditLogs" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "action" TEXT NOT NULL,
    "permission" TEXT,
    "oldValue" JSONB,
    "newValue" JSONB,
    "changedBy" INTEGER,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PermissionAuditLogs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ResourceOwnerships" (
    "id" SERIAL NOT NULL,
    "resourceType" TEXT NOT NULL,
    "resourceId" INTEGER NOT NULL,
    "ownerId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ResourceOwnerships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."MigrationLogs" (
    "id" SERIAL NOT NULL,
    "action" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "command" TEXT NOT NULL,
    "migrationName" TEXT,
    "targetDatabase" TEXT,
    "output" TEXT,
    "error" TEXT,
    "success" BOOLEAN NOT NULL,
    "duration" INTEGER NOT NULL,
    "executedBy" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MigrationLogs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Users_username_key" ON "public"."Users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "Users_email_key" ON "public"."Users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Leads_email_key" ON "public"."Leads"("email");

-- CreateIndex
CREATE INDEX "Leads_status_idx" ON "public"."Leads"("status");

-- CreateIndex
CREATE INDEX "Leads_priority_idx" ON "public"."Leads"("priority");

-- CreateIndex
CREATE INDEX "Leads_assign_idx" ON "public"."Leads"("assign");

-- CreateIndex
CREATE INDEX "Leads_createdAt_idx" ON "public"."Leads"("createdAt");

-- CreateIndex
CREATE INDEX "Leads_name_idx" ON "public"."Leads"("name");

-- CreateIndex
CREATE INDEX "Meetings_startTime_idx" ON "public"."Meetings"("startTime");

-- CreateIndex
CREATE INDEX "Meetings_status_idx" ON "public"."Meetings"("status");

-- CreateIndex
CREATE INDEX "Meetings_leadId_idx" ON "public"."Meetings"("leadId");

-- CreateIndex
CREATE INDEX "Meetings_deletedAt_idx" ON "public"."Meetings"("deletedAt");

-- CreateIndex
CREATE INDEX "Tasks_dueDate_idx" ON "public"."Tasks"("dueDate");

-- CreateIndex
CREATE INDEX "Tasks_status_idx" ON "public"."Tasks"("status");

-- CreateIndex
CREATE INDEX "Tasks_priority_idx" ON "public"."Tasks"("priority");

-- CreateIndex
CREATE INDEX "Tasks_leadId_idx" ON "public"."Tasks"("leadId");

-- CreateIndex
CREATE INDEX "Tasks_assignedTo_idx" ON "public"."Tasks"("assignedTo");

-- CreateIndex
CREATE INDEX "Tasks_createdBy_idx" ON "public"."Tasks"("createdBy");

-- CreateIndex
CREATE INDEX "Tasks_completedAt_idx" ON "public"."Tasks"("completedAt");

-- CreateIndex
CREATE INDEX "Tasks_category_idx" ON "public"."Tasks"("category");

-- CreateIndex
CREATE INDEX "Tasks_deletedAt_idx" ON "public"."Tasks"("deletedAt");

-- CreateIndex
CREATE INDEX "Tasks_subject_idx" ON "public"."Tasks"("subject");

-- CreateIndex
CREATE INDEX "Tasks_status_dueDate_idx" ON "public"."Tasks"("status", "dueDate");

-- CreateIndex
CREATE INDEX "Tasks_leadId_status_idx" ON "public"."Tasks"("leadId", "status");

-- CreateIndex
CREATE INDEX "Tasks_assignedTo_status_idx" ON "public"."Tasks"("assignedTo", "status");

-- CreateIndex
CREATE INDEX "Tasks_createdBy_status_idx" ON "public"."Tasks"("createdBy", "status");

-- CreateIndex
CREATE INDEX "Tasks_status_dueDate_leadId_idx" ON "public"."Tasks"("status", "dueDate", "leadId");

-- CreateIndex
CREATE INDEX "Tasks_status_priority_idx" ON "public"."Tasks"("status", "priority");

-- CreateIndex
CREATE INDEX "Tasks_category_status_idx" ON "public"."Tasks"("category", "status");

-- CreateIndex
CREATE INDEX "Notes_leadId_idx" ON "public"."Notes"("leadId");

-- CreateIndex
CREATE INDEX "Notes_type_idx" ON "public"."Notes"("type");

-- CreateIndex
CREATE INDEX "Notes_isPinned_idx" ON "public"."Notes"("isPinned");

-- CreateIndex
CREATE UNIQUE INDEX "Permissions_name_key" ON "public"."Permissions"("name");

-- CreateIndex
CREATE INDEX "Permissions_category_idx" ON "public"."Permissions"("category");

-- CreateIndex
CREATE INDEX "RolePermissions_role_idx" ON "public"."RolePermissions"("role");

-- CreateIndex
CREATE UNIQUE INDEX "RolePermissions_role_permissionId_key" ON "public"."RolePermissions"("role", "permissionId");

-- CreateIndex
CREATE INDEX "UserPermissions_userId_idx" ON "public"."UserPermissions"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "UserPermissions_userId_permissionId_key" ON "public"."UserPermissions"("userId", "permissionId");

-- CreateIndex
CREATE INDEX "PermissionAuditLogs_userId_idx" ON "public"."PermissionAuditLogs"("userId");

-- CreateIndex
CREATE INDEX "PermissionAuditLogs_action_idx" ON "public"."PermissionAuditLogs"("action");

-- CreateIndex
CREATE INDEX "PermissionAuditLogs_createdAt_idx" ON "public"."PermissionAuditLogs"("createdAt");

-- CreateIndex
CREATE INDEX "ResourceOwnerships_resourceType_resourceId_idx" ON "public"."ResourceOwnerships"("resourceType", "resourceId");

-- CreateIndex
CREATE INDEX "ResourceOwnerships_ownerId_idx" ON "public"."ResourceOwnerships"("ownerId");

-- CreateIndex
CREATE UNIQUE INDEX "ResourceOwnerships_resourceType_resourceId_key" ON "public"."ResourceOwnerships"("resourceType", "resourceId");

-- CreateIndex
CREATE INDEX "MigrationLogs_action_idx" ON "public"."MigrationLogs"("action");

-- CreateIndex
CREATE INDEX "MigrationLogs_executedBy_idx" ON "public"."MigrationLogs"("executedBy");

-- CreateIndex
CREATE INDEX "MigrationLogs_createdAt_idx" ON "public"."MigrationLogs"("createdAt");

-- CreateIndex
CREATE INDEX "MigrationLogs_success_idx" ON "public"."MigrationLogs"("success");

-- AddForeignKey
ALTER TABLE "public"."Users" ADD CONSTRAINT "Users_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "public"."Users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Leads" ADD CONSTRAINT "Leads_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "public"."Users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Leads" ADD CONSTRAINT "Leads_assign_fkey" FOREIGN KEY ("assign") REFERENCES "public"."Users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Meetings" ADD CONSTRAINT "Meetings_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "public"."Leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Meetings" ADD CONSTRAINT "Meetings_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "public"."Users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Meetings" ADD CONSTRAINT "Meetings_deletedBy_fkey" FOREIGN KEY ("deletedBy") REFERENCES "public"."Users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Tasks" ADD CONSTRAINT "Tasks_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "public"."Leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Tasks" ADD CONSTRAINT "Tasks_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "public"."Users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Tasks" ADD CONSTRAINT "Tasks_assignedTo_fkey" FOREIGN KEY ("assignedTo") REFERENCES "public"."Users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Tasks" ADD CONSTRAINT "Tasks_deletedBy_fkey" FOREIGN KEY ("deletedBy") REFERENCES "public"."Users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Notes" ADD CONSTRAINT "Notes_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "public"."Leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Notes" ADD CONSTRAINT "Notes_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "public"."Users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RolePermissions" ADD CONSTRAINT "RolePermissions_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "public"."Permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserPermissions" ADD CONSTRAINT "UserPermissions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."Users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserPermissions" ADD CONSTRAINT "UserPermissions_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "public"."Permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PermissionAuditLogs" ADD CONSTRAINT "PermissionAuditLogs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."Users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PermissionAuditLogs" ADD CONSTRAINT "PermissionAuditLogs_changedBy_fkey" FOREIGN KEY ("changedBy") REFERENCES "public"."Users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ResourceOwnerships" ADD CONSTRAINT "ResourceOwnerships_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "public"."Users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MigrationLogs" ADD CONSTRAINT "MigrationLogs_executedBy_fkey" FOREIGN KEY ("executedBy") REFERENCES "public"."Users"("id") ON DELETE CASCADE ON UPDATE CASCADE;