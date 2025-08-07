/**
 * Production-Ready Authentication Configuration
 * Includes ALL current features: Dev Mode, Impersonation, RBAC, Session Management
 * Optimized for security, performance, and scalability
 */

import NextAuth, { type NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "./prisma";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";

// Production JWT configuration
const JWT_CONFIG = {
  // JWT expires in 24 hours
  maxAge: 24 * 60 * 60, // 24 hours in seconds
  // Token refresh threshold - refresh when 25% of lifetime remains
  updateAge: 6 * 60 * 60, // 6 hours in seconds
};

// Session configuration for production
const SESSION_CONFIG = {
  strategy: "jwt" as const,
  maxAge: JWT_CONFIG.maxAge,
  updateAge: JWT_CONFIG.updateAge,
};

// Enhanced cache for impersonation data with performance optimization
interface CacheEntry {
  user: any;
  timestamp: number;
  expires: number;
  hitCount: number;
}

class ProductionImpersonationCache {
  private cache = new Map<string, CacheEntry>();
  private readonly TTL = 5 * 60 * 1000; // 5 minutes
  private readonly MAX_ENTRIES = 100; // Prevent memory leaks

  set(key: string, user: any): void {
    // Cleanup if cache is getting too large
    if (this.cache.size >= this.MAX_ENTRIES) {
      this.evictOldest();
    }

    const now = Date.now();
    this.cache.set(key, {
      user,
      timestamp: now,
      expires: now + this.TTL,
      hitCount: 0,
    });
  }

  get(key: string): any | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const now = Date.now();
    if (now > entry.expires) {
      this.cache.delete(key);
      return null;
    }

    // Update hit count for LRU eviction
    entry.hitCount++;
    return entry.user;
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  private evictOldest(): void {
    let oldestKey = "";
    let oldestTime = Date.now();
    let lowestHits = Infinity;

    for (const [key, entry] of this.cache.entries()) {
      // Prioritize by age first, then by hit count
      if (
        entry.timestamp < oldestTime ||
        (entry.timestamp === oldestTime && entry.hitCount < lowestHits)
      ) {
        oldestKey = key;
        oldestTime = entry.timestamp;
        lowestHits = entry.hitCount;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }

  // Cleanup expired entries
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expires) {
        this.cache.delete(key);
      }
    }
  }

  // Get cache stats for monitoring
  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.MAX_ENTRIES,
      ttl: this.TTL,
      entries: Array.from(this.cache.entries()).map(([key, entry]) => ({
        key,
        age: Date.now() - entry.timestamp,
        hitCount: entry.hitCount,
        isExpired: Date.now() > entry.expires,
      })),
    };
  }
}

const impersonationCache = new ProductionImpersonationCache();

// Auto-cleanup every 2 minutes
if (typeof window === "undefined") {
  setInterval(() => impersonationCache.cleanup(), 2 * 60 * 1000);
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),

  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) {
          return null;
        }

        try {
          const user = await prisma.user.findUnique({
            where: {
              username: credentials.username,
            },
            select: {
              id: true,
              username: true,
              password: true,
              name: true,
              email: true,
              role: true,
              active: true,
              lastLoginAt: true,
            },
          });

          if (!user || !user.active) {
            return null;
          }

          const isPasswordValid = await bcrypt.compare(
            credentials.password,
            user.password
          );

          if (!isPasswordValid) {
            return null;
          }

          // Update last login timestamp (non-blocking)
          prisma.user
            .update({
              where: { id: user.id },
              data: { lastLoginAt: new Date() },
            })
            .catch((error) => {
              console.error("Failed to update last login:", error);
            });

          return {
            id: user.id.toString(),
            username: user.username,
            name: user.name,
            email: user.email,
            role: user.role,
          };
        } catch (error) {
          console.error("Authentication error:", error);
          return null;
        }
      },
    }),
  ],

  session: SESSION_CONFIG,

  jwt: {
    secret: process.env.NEXTAUTH_SECRET,
    maxAge: JWT_CONFIG.maxAge,
  },

  callbacks: {
    async jwt({ token, user, trigger }) {
      // On sign in, add user data to token
      if (user) {
        token.role = user.role;
        token.username = (user as any).username;
        token.loginTime = Date.now();
      }

      // On session update (when update() is called), refresh user data
      if (trigger === "update") {
        try {
          const freshUser = await prisma.user.findUnique({
            where: { id: parseInt(token.sub || "0") },
            select: {
              id: true,
              name: true,
              email: true,
              username: true,
              role: true,
              active: true,
            },
          });

          if (freshUser && freshUser.active) {
            token.name = freshUser.name;
            token.email = freshUser.email;
            token.role = freshUser.role;
            token.username = freshUser.username;
          } else {
            // User is inactive, invalidate token
            return null;
          }
        } catch (error) {
          console.error("Token refresh error:", error);
          // Keep existing token on error
        }
      }

      return token;
    },

    async session({ session, token }) {
      if (!token) return session;

      const sessionObj = session as {
        user: {
          id?: string;
          role?: string;
          username?: string;
          name?: string;
          email?: string;
          isImpersonated?: boolean;
          realUserId?: string;
          realUserRole?: string;
        };
      };

      // Add token data to session
      sessionObj.user.id = token.sub;
      sessionObj.user.role = token.role as string;
      sessionObj.user.username = token.username as string;

      // Handle Dev Mode Impersonation with Production Optimizations
      try {
        const cookieStore = await cookies();
        const impersonationCookie = cookieStore.get("dev_impersonation");

        if (impersonationCookie && sessionObj.user.role === "Admin-Dev") {
          const impersonationData = JSON.parse(impersonationCookie.value);
          const { targetUserId, realUserId, timestamp } = impersonationData;

          // Check if impersonation is still valid (24 hours)
          const isValid = Date.now() - timestamp < 24 * 60 * 60 * 1000;

          if (isValid && targetUserId) {
            const cacheKey = `impersonation:${targetUserId}`;
            let cachedUser = impersonationCache.get(cacheKey);

            // Fetch from database if not cached
            if (!cachedUser) {
              try {
                const impersonatedUser = await prisma.user.findFirst({
                  where: { id: targetUserId, active: true },
                  select: {
                    id: true,
                    name: true,
                    email: true,
                    username: true,
                    role: true,
                  },
                });

                if (impersonatedUser) {
                  impersonationCache.set(cacheKey, impersonatedUser);
                  cachedUser = impersonatedUser;
                }
              } catch (dbError) {
                console.error("Database error during impersonation:", dbError);
                // Continue with original session if DB fails
                return session;
              }
            }

            if (cachedUser) {
              // Store the real admin user info before impersonation
              const realUserRole = sessionObj.user.role;
              const realUserId = sessionObj.user.id;

              // Override session with impersonated user data
              sessionObj.user.id = cachedUser.id.toString();
              sessionObj.user.name = cachedUser.name || undefined;
              sessionObj.user.email = cachedUser.email;
              sessionObj.user.username = cachedUser.username;
              sessionObj.user.role = cachedUser.role || undefined;
              sessionObj.user.isImpersonated = true;
              sessionObj.user.realUserId = realUserId;
              sessionObj.user.realUserRole = realUserRole;
            }
          } else if (!isValid) {
            // Clean up expired impersonation cookie
            try {
              cookieStore.delete("dev_impersonation");
            } catch (cookieError) {
              console.error(
                "Failed to delete expired impersonation cookie:",
                cookieError
              );
            }
          }
        }
      } catch (error) {
        console.error("Impersonation error:", error);
        // Silently ignore impersonation errors to avoid breaking normal sessions
        // But log them for monitoring
      }

      return session;
    },
  },

  pages: {
    signIn: "/login",
  },

  // Production Security Settings
  useSecureCookies: process.env.NODE_ENV === "production",

  // Enhanced event logging for production monitoring
  events: {
    async signIn({ user, account, profile, isNewUser }) {
      const logData = {
        userId: user.id,
        email: user.email,
        isNewUser,
        timestamp: new Date().toISOString(),
        userAgent:
          process.env.NODE_ENV === "production"
            ? "redacted"
            : account?.provider,
      };

      console.log("User signed in:", logData);

      // In production, you might want to send this to your logging service
      // await sendToLogService('user_signin', logData);
    },

    async signOut({ token }) {
      const logData = {
        userId: token?.sub,
        timestamp: new Date().toISOString(),
      };

      console.log("User signed out:", logData);

      // Clear impersonation cache for this user
      if (token?.sub) {
        const cacheKey = `impersonation:${token.sub}`;
        impersonationCache.delete(cacheKey);
      }
    },

    async session({ session, token }) {
      // Optional: Log session access for security monitoring
      // Only in development or with explicit monitoring flag
      if (process.env.MONITOR_SESSIONS === "true") {
        console.log("Session accessed:", {
          userId: token?.sub,
          isImpersonated: (session.user as any)?.isImpersonated || false,
          timestamp: new Date().toISOString(),
        });
      }
    },
  },

  // Production debugging (only in development)
  debug: process.env.NODE_ENV === "development",

  // Logger configuration for production
  logger: {
    error(code, metadata) {
      console.error("NextAuth Error:", code, metadata);
      // In production, send to error tracking service
      // await sendToErrorTracker('nextauth_error', { code, metadata });
    },
    warn(code) {
      console.warn("NextAuth Warning:", code);
    },
    debug(code, metadata) {
      if (process.env.NODE_ENV === "development") {
        console.debug("NextAuth Debug:", code, metadata);
      }
    },
  },
};

// Export cache utilities for monitoring and management
export const authUtils = {
  // Get impersonation cache stats
  getCacheStats: () => impersonationCache.getStats(),

  // Clear specific cache entry
  clearCacheEntry: (key: string) => impersonationCache.delete(key),

  // Clear all cache
  clearAllCache: () => impersonationCache.clear(),

  // Manual cleanup
  cleanupCache: () => impersonationCache.cleanup(),

  // Health check for auth system
  healthCheck: async () => {
    try {
      // Test database connection
      await prisma.$queryRaw`SELECT 1`;

      const stats = impersonationCache.getStats();

      return {
        status: "healthy",
        database: "connected",
        cache: {
          size: stats.size,
          maxSize: stats.maxSize,
          utilizationPercent: (stats.size / stats.maxSize) * 100,
        },
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        status: "unhealthy",
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      };
    }
  },
};
