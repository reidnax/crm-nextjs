import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/api-response";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";

// POST /api/dev/impersonate - Impersonate a user in dev mode
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!(session as any)?.user) {
      return errorResponse("Unauthorized", 401);
    }

    // Only Admin-Dev can use this endpoint (check both current role and real user role for impersonation)
    const userRole = ((session as any)?.user as any)?.role;
    const realUserRole = ((session as any)?.user as any)?.realUserRole;
    const isAdminDev = userRole === "Admin-Dev" || realUserRole === "Admin-Dev";

    if (!isAdminDev) {
      return errorResponse("Forbidden - Admin-Dev role required", 403);
    }

    const { userId, realUserId } = await request.json();

    if (userId) {
      // Validate that the user exists and is active
      const targetUser = await prisma.user.findFirst({
        where: {
          id: parseInt(userId),
          active: true,
        },
        select: {
          id: true,
          name: true,
          email: true,
          username: true,
          role: true,
          department: true,
        },
      });

      if (!targetUser) {
        return errorResponse("Target user not found or inactive", 404);
      }

      // Store impersonation info in a secure cookie
      const cookieStore = await cookies();
      const impersonationData = {
        targetUserId: targetUser.id,
        realUserId: parseInt(realUserId),
        timestamp: Date.now(),
      };

      cookieStore.set("dev_impersonation", JSON.stringify(impersonationData), {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24, // 24 hours
        path: "/",
      });

      return successResponse({
        message: `Now impersonating ${targetUser.name} (${targetUser.email})`,
        impersonatedUser: targetUser,
      });
    } else {
      // Clear impersonation
      const cookieStore = await cookies();
      cookieStore.delete("dev_impersonation");

      return successResponse({
        message: "Impersonation cleared",
      });
    }
  } catch (error) {
    console.error("Impersonation error:", error);
    return errorResponse("Failed to handle user impersonation");
  }
}
