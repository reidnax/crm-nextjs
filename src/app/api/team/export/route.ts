import { NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { errorResponse } from "@/lib/api-response";
import { PermissionManager } from "@/lib/permissions/core";
import { getEffectiveUserForPermissions } from "@/lib/virtual-session-server";
import { stringify } from "csv-stringify/sync";
import { format } from "date-fns";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return errorResponse("Unauthorized", 401);
    }

    // Get effective user (supports user impersonation)
    const { userId: currentUserId } = await getEffectiveUserForPermissions(
      session
    );

    // Check export permissions
    const canExportTeam = await PermissionManager.hasPermission(
      currentUserId,
      "team.export"
    );
    const canExportUsers = await PermissionManager.hasPermission(
      currentUserId,
      "users.export"
    );
    const canReadAllTeam = await PermissionManager.hasPermission(
      currentUserId,
      "team.read.all"
    );
    const canReadDepartmentTeam = await PermissionManager.hasPermission(
      currentUserId,
      "team.read.department"
    );

    // User must have export permissions or appropriate read permissions
    if (
      !canExportTeam &&
      !canExportUsers &&
      !canReadAllTeam &&
      !canReadDepartmentTeam
    ) {
      return errorResponse(
        "Forbidden: You don't have permission to export team data",
        403
      );
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const role = searchParams.get("role");
    const department = searchParams.get("department");
    const status = searchParams.get("status");

    // Build filter conditions (same as main team API)
    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { username: { contains: search, mode: "insensitive" } },
        { department: { contains: search, mode: "insensitive" } },
        { jobTitle: { contains: search, mode: "insensitive" } },
      ];
    }

    if (role) {
      where.role = role;
    }

    if (department) {
      where.department = department;
    }

    if (status === "active") {
      where.active = true;
    } else if (status === "inactive") {
      where.active = false;
    }

    // Apply permission-based filtering for export (same logic as team listing)
    if (!canReadAllTeam) {
      if (canReadDepartmentTeam || canExportTeam) {
        // Get current user info
        const currentUser = await prisma.user.findUnique({
          where: { id: currentUserId },
          select: { id: true, role: true },
        });

        if (currentUser?.role === "Manager") {
          // Managers can export department team members (excluding admins)
          where.role = { notIn: ["Admin", "Admin-Dev"] };
        } else {
          // Users with only department permissions but not managers get limited export
          return errorResponse(
            "Forbidden: Insufficient permissions to export team data",
            403
          );
        }
      } else {
        // Check if user can only export their own data
        const hasOwnPermission = await PermissionManager.hasPermission(
          currentUserId,
          "users.read.own"
        );

        if (hasOwnPermission) {
          // Assignees can only export their own profile
          where.id = currentUserId;
        } else {
          // No permissions to export any team data
          return errorResponse(
            "Forbidden: You don't have permission to export team data",
            403
          );
        }
      }
    }

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        username: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        department: true,
        jobTitle: true,
        active: true,
        lastLoginAt: true,
        createdAt: true,
        _count: {
          select: {
            assignedLeads: true,
            createdTasks: true,
            createdMeetings: true,
          },
        },
      },
      orderBy: [{ active: "desc" }, { name: "asc" }, { username: "asc" }],
    });

    // Transform data for CSV
    const csvData = users.map((user) => ({
      ID: user.id,
      Username: user.username,
      Name: user.name || "",
      Email: user.email,
      Phone: user.phone || "",
      Role: user.role || "",
      Department: user.department || "",
      "Job Title": user.jobTitle || "",
      Status: user.active ? "Active" : "Inactive",
      "Assigned Leads": user._count.assignedLeads,
      "Created Tasks": user._count.createdTasks,
      "Created Meetings": user._count.createdMeetings,
      "Last Login": user.lastLoginAt
        ? format(new Date(user.lastLoginAt), "dd/MM/yyyy")
        : "Never",
      "Created Date": format(new Date(user.createdAt), "dd/MM/yyyy"),
    }));

    // Generate CSV
    const csv = stringify(csvData, {
      header: true,
      columns: [
        "ID",
        "Username",
        "Name",
        "Email",
        "Phone",
        "Role",
        "Department",
        "Job Title",
        "Status",
        "Assigned Leads",
        "Created Tasks",
        "Created Meetings",
        "Last Login",
        "Created Date",
      ],
    });

    // Generate filename with current date
    const currentDate = new Date().toISOString().split("T")[0];
    const filename = `team-members-${currentDate}.csv`;

    return new Response(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("Error exporting team members:", error);
    return errorResponse("Failed to export team members", 500);
  }
}
