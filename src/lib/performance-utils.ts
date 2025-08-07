// Performance monitoring utilities
export class PerformanceMonitor {
  private static timers: Map<string, number> = new Map();

  static start(label: string): void {
    this.timers.set(label, Date.now());
  }

  static end(label: string): number {
    const startTime = this.timers.get(label);
    if (!startTime) {
      console.warn(`Timer "${label}" was not started`);
      return 0;
    }

    const duration = Date.now() - startTime;
    this.timers.delete(label);

    if (process.env.NODE_ENV === "development") {
      console.log(`⏱️ ${label}: ${duration}ms`);
    }

    return duration;
  }

  static async measureAsync<T>(
    label: string,
    fn: () => Promise<T>
  ): Promise<T> {
    this.start(label);
    try {
      const result = await fn();
      this.end(label);
      return result;
    } catch (error) {
      this.end(label);
      throw error;
    }
  }

  static measure<T>(label: string, fn: () => T): T {
    this.start(label);
    try {
      const result = fn();
      this.end(label);
      return result;
    } catch (error) {
      this.end(label);
      throw error;
    }
  }
}

// Advanced cache utility with TTL and memory management
export class AdvancedCache {
  private static cache: Map<
    string,
    { data: any; timestamp: number; ttl: number }
  > = new Map();
  private static maxSize = 1000; // Maximum cache entries
  private static cleanupInterval = 5 * 60 * 1000; // 5 minutes

  static generateKey(prefix: string, ...args: any[]): string {
    return `${prefix}:${args.join(":")}`;
  }

  static get<T>(key: string): T | null {
    const cached = this.cache.get(key);

    if (!cached) return null;

    // Check if cache is expired
    if (Date.now() - cached.timestamp > cached.ttl) {
      this.cache.delete(key);
      return null;
    }

    return cached.data as T;
  }

  static set(key: string, data: any, ttl: number = 5 * 60 * 1000): void {
    // Cleanup if cache is too large
    if (this.cache.size >= this.maxSize) {
      this.cleanup();
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
  }

  static clear(pattern?: string): void {
    if (pattern) {
      // Clear specific pattern
      for (const [key] of this.cache) {
        if (key.includes(pattern)) {
          this.cache.delete(key);
        }
      }
    } else {
      // Clear all
      this.cache.clear();
    }
  }

  private static cleanup(): void {
    const now = Date.now();
    const entries = Array.from(this.cache.entries());

    // Sort by timestamp (oldest first)
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp);

    // Remove oldest 20% of entries
    const toRemove = Math.ceil(entries.length * 0.2);
    for (let i = 0; i < toRemove; i++) {
      this.cache.delete(entries[i][0]);
    }
  }

  static clearExpired(): void {
    const now = Date.now();
    for (const [key, cached] of this.cache) {
      if (now - cached.timestamp > cached.ttl) {
        this.cache.delete(key);
      }
    }
  }
}

// Cache utility for permission checks
export class PermissionCache {
  private static cache: Map<string, { data: boolean; timestamp: number }> =
    new Map();
  private static CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  static generateKey(userId: number, permission: string): string {
    return `${userId}:${permission}`;
  }

  static get(userId: number, permission: string): boolean | null {
    const key = this.generateKey(userId, permission);
    const cached = this.cache.get(key);

    if (!cached) return null;

    // Check if cache is expired
    if (Date.now() - cached.timestamp > this.CACHE_DURATION) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  static set(userId: number, permission: string, value: boolean): void {
    const key = this.generateKey(userId, permission);
    this.cache.set(key, {
      data: value,
      timestamp: Date.now(),
    });
  }

  static clear(userId?: number): void {
    if (userId) {
      // Clear specific user's permissions
      for (const [key] of this.cache) {
        if (key.startsWith(`${userId}:`)) {
          this.cache.delete(key);
        }
      }
    } else {
      // Clear all permissions
      this.cache.clear();
    }
  }

  static clearExpired(): void {
    const now = Date.now();
    for (const [key, cached] of this.cache) {
      if (now - cached.timestamp > this.CACHE_DURATION) {
        this.cache.delete(key);
      }
    }
  }
}

// Database query optimization utilities
export class DatabaseOptimizer {
  static async batchPermissionChecks(
    userId: number,
    permissions: string[]
  ): Promise<Record<string, boolean>> {
    const { PermissionManager } = await import("@/lib/permissions/core");
    const results: Record<string, boolean> = {};

    // Check cache first
    for (const permission of permissions) {
      const cached = PermissionCache.get(userId, permission);
      if (cached !== null) {
        results[permission] = cached;
      }
    }

    // Get uncached permissions
    const uncachedPermissions = permissions.filter((p) => !(p in results));

    if (uncachedPermissions.length > 0) {
      // Batch database query
      const batchResults = await Promise.all(
        uncachedPermissions.map(async (permission) => {
          const hasPermission = await PermissionManager.hasPermission(
            userId,
            permission as any
          );
          PermissionCache.set(userId, permission, hasPermission);
          return { permission, hasPermission };
        })
      );

      // Merge results
      batchResults.forEach(({ permission, hasPermission }) => {
        results[permission] = hasPermission;
      });
    }

    return results;
  }

  // Optimized dashboard data fetcher with caching
  static async getDashboardData(
    userId: number,
    permissions: Record<string, boolean>,
    cacheKey: string
  ) {
    // Check cache first
    const cached = AdvancedCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    // Build optimized filters
    const filters = await this.buildOptimizedFilters(userId, permissions);

    // Execute all queries in parallel with minimal field selection
    const [
      totalLeads,
      totalMeetings,
      totalTasks,
      totalNotes,
      todaysMeetings,
      todaysTasks,
      leadsByStatus,
      tasksByStatus,
      recentLeads,
      recentMeetings,
      recentTasks,
      recentNotes,
    ] = await Promise.all([
      // Count queries with minimal overhead
      prisma.lead.count({ where: filters.leads }),
      prisma.meeting.count({ where: filters.meetings }),
      prisma.task.count({ where: filters.tasks }),
      prisma.note.count({ where: filters.notes }),

      // Today's items
      prisma.meeting.count({
        where: {
          ...filters.meetings,
          startTime: { gte: filters.today, lt: filters.tomorrow },
        },
      }),
      prisma.task.count({
        where: {
          ...filters.tasks,
          dueDate: { gte: filters.today, lt: filters.tomorrow },
        },
      }),

      // Status breakdowns
      prisma.lead.groupBy({
        by: ["status"],
        where: filters.leads,
        _count: { id: true },
      }),
      prisma.task.groupBy({
        by: ["status"],
        where: filters.tasks,
        _count: { id: true },
      }),

      // Recent items with minimal fields
      prisma.lead.findMany({
        where: filters.leads,
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true,
          name: true,
          company: true,
          status: true,
          createdAt: true,
          assignee: { select: { name: true } },
        },
      }),
      prisma.meeting.findMany({
        where: filters.meetings,
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true,
          subject: true,
          startTime: true,
          createdAt: true,
          lead: { select: { company: true } },
        },
      }),
      prisma.task.findMany({
        where: filters.tasks,
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true,
          subject: true,
          status: true,
          dueDate: true,
          priority: true,
          createdAt: true,
          lead: { select: { company: true } },
        },
      }),
      prisma.note.findMany({
        where: filters.notes,
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true,
          subject: true,
          description: true,
          createdAt: true,
          lead: { select: { company: true } },
        },
      }),
    ]);

    const data = {
      stats: {
        totalLeads,
        totalMeetings,
        totalTasks,
        totalNotes,
        todaysMeetings,
        todaysTasks,
      },
      breakdowns: {
        leadsByStatus: leadsByStatus.map((item) => ({
          status: item.status,
          count: item._count.id,
        })),
        tasksByStatus: tasksByStatus.map((item) => ({
          status: item.status,
          count: item._count.id,
        })),
      },
      recent: {
        leads: recentLeads,
        meetings: recentMeetings,
        tasks: recentTasks,
        notes: recentNotes,
      },
    };

    // Cache for 2 minutes
    AdvancedCache.set(cacheKey, data, 2 * 60 * 1000);
    return data;
  }

  private static async buildOptimizedFilters(
    userId: number,
    permissions: Record<string, boolean>
  ) {
    const today = new Date();
    const startOfDay = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate()
    );
    const endOfDay = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate() + 1
    );

    return {
      today: startOfDay,
      tomorrow: endOfDay,
      leads: await this.buildLeadsFilter(userId, permissions),
      meetings: await this.buildMeetingsFilter(userId, permissions),
      tasks: await this.buildTasksFilter(userId, permissions),
      notes: await this.buildNotesFilter(userId, permissions),
    };
  }

  private static async buildLeadsFilter(
    userId: number,
    permissions: Record<string, boolean>
  ) {
    const hasViewAll = (permissions as any)["leads.read.all"] ?? false;
    const hasViewAssigned =
      (permissions as any)["leads.read.assigned"] ?? false;
    const hasViewDepartment =
      (permissions as any)["leads.read.department"] ?? false;

    if (hasViewAll) return {};

    const filters = [];
    if (hasViewAssigned) {
      filters.push({ assign: userId }, { createdBy: userId });
    }
    if (hasViewDepartment) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { department: true },
      });
      if (user?.department) {
        filters.push({
          OR: [
            { assignee: { department: user.department } },
            { creator: { department: user.department } },
          ],
        });
      }
    }

    return filters.length > 0 ? { OR: filters } : { id: -1 }; // No access
  }

  private static async buildMeetingsFilter(
    userId: number,
    permissions: Record<string, boolean>
  ) {
    const hasViewAll = (permissions as any)["meetings.read.all"] ?? false;
    const hasViewAssigned =
      (permissions as any)["meetings.read.assigned"] ?? false;
    const hasViewDepartment =
      (permissions as any)["meetings.read.department"] ?? false;

    if (hasViewAll) return {};

    const filters = [];
    if (hasViewAssigned) {
      filters.push({ assign: userId }, { createdBy: userId });
    }
    if (hasViewDepartment) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { department: true },
      });
      if (user?.department) {
        filters.push({
          OR: [
            { assignee: { department: user.department } },
            { creator: { department: user.department } },
          ],
        });
      }
    }

    return filters.length > 0 ? { OR: filters } : { id: -1 };
  }

  private static async buildTasksFilter(
    userId: number,
    permissions: Record<string, boolean>
  ) {
    const hasViewAll = (permissions as any)["tasks.read.all"] ?? false;
    const hasViewAssigned =
      (permissions as any)["tasks.read.assigned"] ?? false;
    const hasViewDepartment =
      (permissions as any)["tasks.read.department"] ?? false;

    if (hasViewAll) return {};

    const filters = [];
    if (hasViewAssigned) {
      filters.push({ assign: userId }, { createdBy: userId });
    }
    if (hasViewDepartment) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { department: true },
      });
      if (user?.department) {
        filters.push({
          OR: [
            { assignee: { department: user.department } },
            { creator: { department: user.department } },
          ],
        });
      }
    }

    return filters.length > 0 ? { OR: filters } : { id: -1 };
  }

  private static async buildNotesFilter(
    userId: number,
    permissions: Record<string, boolean>
  ) {
    const hasViewAll = (permissions as any)["notes.read.all"] ?? false;
    const hasViewAssigned =
      (permissions as any)["notes.read.assigned"] ?? false;
    const hasViewDepartment =
      (permissions as any)["notes.read.department"] ?? false;

    if (hasViewAll) return {};

    const filters = [];
    if (hasViewAssigned) {
      filters.push({ assign: userId }, { createdBy: userId });
    }
    if (hasViewDepartment) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { department: true },
      });
      if (user?.department) {
        filters.push({
          OR: [
            { assignee: { department: user.department } },
            { creator: { department: user.department } },
          ],
        });
      }
    }

    return filters.length > 0 ? { OR: filters } : { id: -1 };
  }
}

// Import prisma for the DatabaseOptimizer
import { prisma } from "@/lib/prisma";
