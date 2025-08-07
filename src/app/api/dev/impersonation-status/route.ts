import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/api-response";
import { prisma } from "@/lib/prisma";
// GET /api/dev/impersonation-status - Get current impersonation status
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

    // Check if we're currently impersonating
    const isImpersonated = (session.user as any)?.isImpersonated;
    const realUserId = (session.user as any)?.realUserId;

    if (isImpersonated) {
      // Get the impersonated user's full data
      const impersonatedUser = await prisma.user.findFirst({
        where: {
          id: parseInt((session.user as any).id),
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
      });

      if (impersonatedUser) {
        return successResponse({
          isImpersonating: true,
          impersonatedUser,
          realUserId: parseInt(realUserId),
        });
      }
    }

    return successResponse({
      isImpersonating: false,
      impersonatedUser: null,
      realUserId: null,
    });
  } catch (error) {
    console.error("Impersonation status check error:", error);
    return errorResponse("Failed to check impersonation status");
  }
}
