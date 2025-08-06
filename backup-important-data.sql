-- Backup Important Data Before Migration
-- Run this script to backup critical data before applying Prisma changes

-- Backup Messages table (if you want to preserve this data)
CREATE TABLE Messages_Backup_Final AS 
SELECT * FROM "Messages";

-- Backup Lead_Backup table (if needed)
CREATE TABLE Lead_Backup_Final AS 
SELECT * FROM "Lead_Backup";

-- Backup SequelizeMeta (migration history)
CREATE TABLE SequelizeMeta_Backup AS 
SELECT * FROM "SequelizeMeta";

-- Verify backups
SELECT 
  'Messages_Backup_Final' as table_name, 
  COUNT(*) as row_count 
FROM Messages_Backup_Final
UNION ALL
SELECT 
  'Lead_Backup_Final' as table_name, 
  COUNT(*) as row_count 
FROM Lead_Backup_Final
UNION ALL
SELECT 
  'SequelizeMeta_Backup' as table_name, 
  COUNT(*) as row_count 
FROM SequelizeMeta_Backup;