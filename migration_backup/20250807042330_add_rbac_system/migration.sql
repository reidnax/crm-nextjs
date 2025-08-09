-- Add RBAC (Role-Based Access Control) System
-- This migration adds comprehensive permission and audit tables

-- Create Permissions table
CREATE TABLE "Permissions" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Permissions_pkey" PRIMARY KEY ("id")
);

-- Create RolePermissions table
CREATE TABLE "RolePermissions" (
    "id" SERIAL NOT NULL,
    "role" TEXT NOT NULL,
    "permissionId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RolePermissions_pkey" PRIMARY KEY ("id")
);

-- Create UserPermissions table
CREATE TABLE "UserPermissions" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "permissionId" INTEGER NOT NULL,
    "granted" BOOLEAN NOT NULL DEFAULT true,
    "grantedBy" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "UserPermissions_pkey" PRIMARY KEY ("id")
);

-- Create ResourceOwnerships table
CREATE TABLE "ResourceOwnerships" (
    "id" SERIAL NOT NULL,
    "resourceType" TEXT NOT NULL,
    "resourceId" INTEGER NOT NULL,
    "ownerId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ResourceOwnerships_pkey" PRIMARY KEY ("id")
);

-- Create PermissionAuditLogs table
CREATE TABLE "PermissionAuditLogs" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "action" TEXT NOT NULL,
    "resourceType" TEXT,
    "resourceId" INTEGER,
    "details" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "success" BOOLEAN NOT NULL DEFAULT true,
    "changedBy" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PermissionAuditLogs_pkey" PRIMARY KEY ("id")
);

-- Add managerId field to Users table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Users' AND column_name = 'managerId'
    ) THEN
        ALTER TABLE "Users" ADD COLUMN "managerId" INTEGER;
    END IF;
END $$;

-- Create indexes for Permissions table
CREATE UNIQUE INDEX "Permissions_name_key" ON "Permissions"("name");
CREATE INDEX "Permissions_category_idx" ON "Permissions"("category");

-- Create indexes for RolePermissions table
CREATE UNIQUE INDEX "RolePermissions_role_permissionId_key" ON "RolePermissions"("role", "permissionId");
CREATE INDEX "RolePermissions_role_idx" ON "RolePermissions"("role");

-- Create indexes for UserPermissions table
CREATE UNIQUE INDEX "UserPermissions_userId_permissionId_key" ON "UserPermissions"("userId", "permissionId");
CREATE INDEX "UserPermissions_userId_idx" ON "UserPermissions"("userId");

-- Create indexes for ResourceOwnerships table
CREATE UNIQUE INDEX "ResourceOwnerships_resourceType_resourceId_key" ON "ResourceOwnerships"("resourceType", "resourceId");
CREATE INDEX "ResourceOwnerships_ownerId_idx" ON "ResourceOwnerships"("ownerId");
CREATE INDEX "ResourceOwnerships_resourceType_resourceId_idx" ON "ResourceOwnerships"("resourceType", "resourceId");

-- Create indexes for PermissionAuditLogs table
CREATE INDEX "PermissionAuditLogs_userId_idx" ON "PermissionAuditLogs"("userId");
CREATE INDEX "PermissionAuditLogs_action_idx" ON "PermissionAuditLogs"("action");
CREATE INDEX "PermissionAuditLogs_createdAt_idx" ON "PermissionAuditLogs"("createdAt");

-- Add foreign key constraints
ALTER TABLE "RolePermissions" ADD CONSTRAINT "RolePermissions_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "Permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "UserPermissions" ADD CONSTRAINT "UserPermissions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserPermissions" ADD CONSTRAINT "UserPermissions_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "Permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ResourceOwnerships" ADD CONSTRAINT "ResourceOwnerships_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PermissionAuditLogs" ADD CONSTRAINT "PermissionAuditLogs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PermissionAuditLogs" ADD CONSTRAINT "PermissionAuditLogs_changedBy_fkey" FOREIGN KEY ("changedBy") REFERENCES "Users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Add self-referencing foreign key for Users.managerId
ALTER TABLE "Users" ADD CONSTRAINT "Users_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "Users"("id") ON DELETE SET NULL ON UPDATE CASCADE;