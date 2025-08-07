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
            permission
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
}
