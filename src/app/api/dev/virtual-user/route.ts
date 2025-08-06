/**
 * Virtual User Registration API
 * Allows Admin-Dev users to register their virtual user choice server-side
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import {
  registerVirtualUser,
  unregisterVirtualUser,
  getVirtualUserChoice,
} from "@/lib/virtual-session-server";
import { getVirtualUserById } from "@/lib/virtual-users";

// POST /api/dev/virtual-user - Register virtual user choice
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== "Admin-Dev") {
      return NextResponse.json(
        { success: false, error: "Unauthorized - Admin-Dev only" },
        { status: 403 }
      );
    }

    const { virtualUserRole } = await request.json();
    const realUserId = parseInt(session.user.id);

    if (!virtualUserRole) {
      // Unregister virtual user
      unregisterVirtualUser(realUserId);
      return NextResponse.json({
        success: true,
        message: "Virtual user unregistered",
      });
    }

    // Find virtual user by role
    const virtualUser = Object.values(
      (await import("@/lib/virtual-users")).VIRTUAL_TEST_USERS
    ).find((user) => user.role === virtualUserRole);

    if (!virtualUser) {
      return NextResponse.json(
        { success: false, error: "Invalid virtual user role" },
        { status: 400 }
      );
    }

    // Register virtual user choice
    registerVirtualUser(realUserId, virtualUser.id, virtualUser.role);

    console.log(
      `Admin-Dev ${realUserId} registered virtual user: ${virtualUser.role} (ID: ${virtualUser.id})`
    );

    return NextResponse.json({
      success: true,
      message: `Virtual user ${virtualUser.role} registered`,
      virtualUser: {
        id: virtualUser.id,
        role: virtualUser.role,
        name: virtualUser.name,
      },
    });
  } catch (error) {
    console.error("Error registering virtual user:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

// GET /api/dev/virtual-user - Get current virtual user choice
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== "Admin-Dev") {
      return NextResponse.json(
        { success: false, error: "Unauthorized - Admin-Dev only" },
        { status: 403 }
      );
    }

    const realUserId = parseInt(session.user.id);
    const virtualChoice = getVirtualUserChoice(realUserId);

    if (!virtualChoice) {
      return NextResponse.json({
        success: true,
        virtualUser: null,
      });
    }

    const virtualUser = getVirtualUserById(virtualChoice.virtualUserId);

    return NextResponse.json({
      success: true,
      virtualUser: virtualUser
        ? {
            id: virtualUser.id,
            role: virtualUser.role,
            name: virtualUser.name,
          }
        : null,
    });
  } catch (error) {
    console.error("Error getting virtual user:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
