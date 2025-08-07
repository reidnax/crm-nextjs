/**
 * User Details API Route for Permission Context
 * Returns detailed user information for permission checking
 */

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { successResponse, errorResponse } from "@/lib/api-response";

export async function GET() {
  try {
    // Get authenticated session
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return errorResponse("Authentication required", 401);
    }

    const userId = parseInt(session?.user?.id || "0");

    // Get user details with relationships
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        role: true,
        department: true,
        managerId: true,
        manager: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        subordinates: {
          select: {
            id: true,
            name: true,
            email: true,
            department: true,
          },
        },
      },
    });

    if (!user) {
      return errorResponse("User not found", 404);
    }
    return successResponse({
      user,
    });
  } catch (error) {
    console.error("Error fetching user details:", error);
    return errorResponse("Failed to fetch user details", 500);
  }
}
