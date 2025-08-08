-- Migration: add_migration_logs_table
-- Description: Add MigrationLog table for persistent migration logging
-- This migration adds a new table to store migration execution logs

-- Create MigrationLog table
CREATE TABLE "MigrationLogs" (
    "id" SERIAL PRIMARY KEY,
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
    "executedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL
);

-- Create indexes for better performance
CREATE INDEX "MigrationLogs_action_idx" ON "MigrationLogs"("action");
CREATE INDEX "MigrationLogs_executedBy_idx" ON "MigrationLogs"("executedBy");
CREATE INDEX "MigrationLogs_executedAt_idx" ON "MigrationLogs"("executedAt");
CREATE INDEX "MigrationLogs_success_idx" ON "MigrationLogs"("success");

-- Add foreign key constraint
ALTER TABLE "MigrationLogs" ADD CONSTRAINT "MigrationLogs_executedBy_fkey" FOREIGN KEY ("executedBy") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE; 