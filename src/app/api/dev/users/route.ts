import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/api-response";
import { prisma } from "@/lib/prisma";

// GET /api/dev/users - Get all users for dev mode switching
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return errorResponse("Unauthorized", 401);
    }

    // Only Admin-Dev can access this endpoint (check both current role and real user role for impersonation)
    const userRole = (session.user as any)?.role;
    const realUserRole = (session.user as any)?.realUserRole;
    const isAdminDev = userRole === "Admin-Dev" || realUserRole === "Admin-Dev";

    if (!isAdminDev) {
      return errorResponse("Forbidden - Admin-Dev role required", 403);
    }

    // Fetch all active users with basic info
    const users = await prisma.user.findMany({
      where: {
        active: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        username: true,
        role: true,
        department: true,
        jobTitle: true,
        avatar: true,
        lastLoginAt: true,
        createdAt: true,
      },
      orderBy: [{ role: "asc" }, { name: "asc" }],
    });

    // Group users by role for better organization
    const usersByRole = users.reduce((acc, user) => {
      if (!acc[user.role]) {
        acc[user.role] = [];
      }
      acc[user.role].push(user);
      return acc;
    }, {} as Record<string, typeof users>);

    return successResponse({
      users,
      usersByRole,
      totalUsers: users.length,
      roles: Object.keys(usersByRole),
    });
  } catch (error) {
    console.error("Dev users fetch error:", error);
    return errorResponse("Failed to fetch users for dev mode");
  }
}
