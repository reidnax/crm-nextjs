-- Migration: CU-86czwxrm5_Task-Management
-- Description: Enhanced task management system with advanced filtering, analytics, and improved UX
-- This migration adds new task fields and performance indexes for the recent commit changes

-- Add new fields to Tasks table (if not exists)
DO $$
BEGIN
    -- Enhanced task fields for advanced task management
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Tasks' AND column_name = 'category') THEN
        ALTER TABLE "Tasks" ADD COLUMN "category" TEXT;
        RAISE NOTICE 'Added column: Tasks.category';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Tasks' AND column_name = 'estimatedHours') THEN
        ALTER TABLE "Tasks" ADD COLUMN "estimatedHours" DOUBLE PRECISION;
        RAISE NOTICE 'Added column: Tasks.estimatedHours';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Tasks' AND column_name = 'actualHours') THEN
        ALTER TABLE "Tasks" ADD COLUMN "actualHours" DOUBLE PRECISION;
        RAISE NOTICE 'Added column: Tasks.actualHours';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Tasks' AND column_name = 'completedAt') THEN
        ALTER TABLE "Tasks" ADD COLUMN "completedAt" TIMESTAMP(3);
        RAISE NOTICE 'Added column: Tasks.completedAt';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Tasks' AND column_name = 'tags') THEN
        ALTER TABLE "Tasks" ADD COLUMN "tags" TEXT[] DEFAULT '{}';
        RAISE NOTICE 'Added column: Tasks.tags';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Tasks' AND column_name = 'isRecurring') THEN
        ALTER TABLE "Tasks" ADD COLUMN "isRecurring" BOOLEAN DEFAULT false;
        RAISE NOTICE 'Added column: Tasks.isRecurring';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Tasks' AND column_name = 'parentId') THEN
        ALTER TABLE "Tasks" ADD COLUMN "parentId" INTEGER;
        RAISE NOTICE 'Added column: Tasks.parentId';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Tasks' AND column_name = 'reminderDate') THEN
        ALTER TABLE "Tasks" ADD COLUMN "reminderDate" TIMESTAMP(3);
        RAISE NOTICE 'Added column: Tasks.reminderDate';
    END IF;
    
    RAISE NOTICE 'Tasks table enhancement completed successfully';
END $$;

-- Create new indexes for performance optimization
DO $$
BEGIN
    -- Text search indexes
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'Tasks' AND indexname = 'Tasks_subject_idx') THEN
        CREATE INDEX "Tasks_subject_idx" ON "Tasks"("subject");
        RAISE NOTICE 'Created index: Tasks_subject_idx';
    END IF;
    
    -- Composite indexes for common query patterns
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'Tasks' AND indexname = 'Tasks_status_dueDate_idx') THEN
        CREATE INDEX "Tasks_status_dueDate_idx" ON "Tasks"("status", "dueDate");
        RAISE NOTICE 'Created index: Tasks_status_dueDate_idx';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'Tasks' AND indexname = 'Tasks_leadId_status_idx') THEN
        CREATE INDEX "Tasks_leadId_status_idx" ON "Tasks"("leadId", "status");
        RAISE NOTICE 'Created index: Tasks_leadId_status_idx';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'Tasks' AND indexname = 'Tasks_assignedTo_status_idx') THEN
        CREATE INDEX "Tasks_assignedTo_status_idx" ON "Tasks"("assignedTo", "status");
        RAISE NOTICE 'Created index: Tasks_assignedTo_status_idx';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'Tasks' AND indexname = 'Tasks_createdBy_status_idx') THEN
        CREATE INDEX "Tasks_createdBy_status_idx" ON "Tasks"("createdBy", "status");
        RAISE NOTICE 'Created index: Tasks_createdBy_status_idx';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'Tasks' AND indexname = 'Tasks_status_dueDate_leadId_idx') THEN
        CREATE INDEX "Tasks_status_dueDate_leadId_idx" ON "Tasks"("status", "dueDate", "leadId");
        RAISE NOTICE 'Created index: Tasks_status_dueDate_leadId_idx';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'Tasks' AND indexname = 'Tasks_status_priority_idx') THEN
        CREATE INDEX "Tasks_status_priority_idx" ON "Tasks"("status", "priority");
        RAISE NOTICE 'Created index: Tasks_status_priority_idx';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'Tasks' AND indexname = 'Tasks_category_status_idx') THEN
        CREATE INDEX "Tasks_category_status_idx" ON "Tasks"("category", "status");
        RAISE NOTICE 'Created index: Tasks_category_status_idx';
    END IF;
    
    RAISE NOTICE 'Performance indexes created successfully';
END $$;

-- Add foreign key constraint for Tasks.parentId (for recurring tasks)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'Tasks_parentId_fkey' 
        AND table_name = 'Tasks'
    ) THEN
        ALTER TABLE "Tasks" ADD CONSTRAINT "Tasks_parentId_fkey" 
        FOREIGN KEY ("parentId") REFERENCES "Tasks"("id") ON DELETE SET NULL ON UPDATE CASCADE;
        RAISE NOTICE 'Added foreign key constraint: Tasks_parentId_fkey';
    END IF;
END $$;

-- Summary message
DO $$
BEGIN
    RAISE NOTICE '✅ Migration CU-86czwxrm5_Task-Management completed successfully!';
    RAISE NOTICE '📊 Enhanced task management with:';
    RAISE NOTICE '   - Advanced task categorization';
    RAISE NOTICE '   - Time tracking (estimated/actual hours)';
    RAISE NOTICE '   - Task completion timestamps';
    RAISE NOTICE '   - Tag-based organization';
    RAISE NOTICE '   - Recurring task support';
    RAISE NOTICE '   - Reminder functionality';
    RAISE NOTICE '   - Performance-optimized indexes';
    RAISE NOTICE '🚀 Ready for production deployment!';
END $$;