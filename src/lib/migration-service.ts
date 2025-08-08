import { prisma } from "./prisma";

export interface MigrationLogData {
  action: string;
  description: string;
  command: string;
  migrationName?: string;
  targetDatabase?: string;
  output?: string;
  error?: string;
  success: boolean;
  duration: number;
  executedBy: number;
}

export class MigrationService {
  /**
   * Log a migration execution
   */
  static async logMigration(data: MigrationLogData): Promise<void> {
    try {
      await prisma.migrationLog.create({
        data: {
          action: data.action,
          description: data.description,
          command: data.command,
          migrationName: data.migrationName || null,
          targetDatabase: data.targetDatabase || null,
          output: data.output || null,
          error: data.error || null,
          success: data.success,
          duration: data.duration,
          executedBy: data.executedBy,
        },
      });
    } catch (error) {
      console.error("Failed to log migration:", error);
      // Don't throw - migration logging should not break main functionality
    }
  }

  /**
   * Get migration logs with pagination and filtering
   */
  static async getMigrationLogs(
    limit: number = 50,
    offset: number = 0,
    filters: {
      action?: string;
      success?: boolean;
      executedBy?: number;
      startDate?: Date;
      endDate?: Date;
    } = {}
  ) {
    const where: any = {};

    if (filters.action) {
      where.action = filters.action;
    }

    if (filters.success !== undefined) {
      where.success = filters.success;
    }

    if (filters.executedBy) {
      where.executedBy = filters.executedBy;
    }

    if (filters.startDate || filters.endDate) {
      where.executedAt = {};
      if (filters.startDate) {
        where.executedAt.gte = filters.startDate;
      }
      if (filters.endDate) {
        where.executedAt.lte = filters.endDate;
      }
    }

    const logs = await prisma.migrationLog.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
      orderBy: {
        executedAt: "desc",
      },
      take: limit,
      skip: offset,
    });

    const total = await prisma.migrationLog.count({ where });

    return {
      logs,
      total,
      page: Math.floor(offset / limit) + 1,
      limit,
    };
  }

  /**
   * Get recent migration logs (last 10)
   */
  static async getRecentMigrationLogs() {
    return this.getMigrationLogs(10, 0);
  }

  /**
   * Get migration logs for a specific user
   */
  static async getUserMigrationLogs(userId: number, limit: number = 50) {
    return this.getMigrationLogs(limit, 0, { executedBy: userId });
  }

  /**
   * Get migration logs for a specific migration
   */
  static async getMigrationLogsByName(migrationName: string, limit: number = 50) {
    const logs = await prisma.migrationLog.findMany({
      where: {
        migrationName: migrationName,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
      orderBy: {
        executedAt: "desc",
      },
      take: limit,
    });

    return logs;
  }
} 