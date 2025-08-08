import { NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { errorResponse } from "@/lib/api-response";
import { PermissionManager } from "@/lib/permissions/core";
import { getEffectiveUserForPermissions } from "@/lib/virtual-session-server";
import { format } from "date-fns";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return errorResponse("Unauthorized", 401);
    }

    // Get effective user (supports user impersonation)
    const { userId } = await getEffectiveUserForPermissions(session);

    // Check export permissions
    const hasExportAllLeads = await PermissionManager.hasPermission(
      userId,
      "leads.export.all"
    );
    const hasExportDepartmentLeads = await PermissionManager.hasPermission(
      userId,
      "leads.export.department"
    );
    const hasExportAssignedLeads = await PermissionManager.hasPermission(
      userId,
      "leads.export.assigned"
    );

    // User must have at least one export permission
    if (
      !hasExportAllLeads &&
      !hasExportDepartmentLeads &&
      !hasExportAssignedLeads
    ) {
      return errorResponse(
        "Forbidden: You don't have permission to export leads",
        403
      );
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");
    const statuses = searchParams.getAll("status");
    const subStatuses = searchParams.getAll("subStatus");
    const assigneeNames = searchParams.getAll("assignee");
    const businessCategories = searchParams.getAll("businessCategory");
    const businessIndustries = searchParams.getAll("businessIndustry");
    const cities = searchParams.getAll("city");
    const states = searchParams.getAll("state");

    // Build where clause with permission-based filtering (same logic as main leads API)
    const where: Record<string, unknown> = {};

    // Apply permission-based lead filtering
    if (!hasExportAllLeads) {
      const permissionFilters = [];

      if (hasExportAssignedLeads) {
        // Can export leads assigned to them or created by them
        permissionFilters.push({ assign: userId }, { createdBy: userId });
      }

      if (hasExportDepartmentLeads) {
        // Get user's department and add department-based filtering
        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: { department: true, role: true },
        });

        // For now, managers can export department leads
        if (user?.role === "Manager" || user?.role === "Admin") {
          permissionFilters.push({
            OR: [
              { assign: { not: null } }, // All assigned leads for managers
              { createdBy: { not: null } }, // All created leads for managers
            ],
          });
        }
      }

      if (permissionFilters.length > 0) {
        where.OR = permissionFilters;
      } else {
        // No permission to export any leads
        return errorResponse("Forbidden: No leads available for export", 403);
      }
    }

    // Apply search filters (combine with permission filters)
    if (search) {
      const searchConditions = [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { phone: { contains: search, mode: "insensitive" } },
        { company: { contains: search, mode: "insensitive" } },
        { city: { contains: search, mode: "insensitive" } },
        { state: { contains: search, mode: "insensitive" } },
        { businessCategory: { contains: search, mode: "insensitive" } },
        { businessIndustry: { contains: search, mode: "insensitive" } },
      ];

      if (where.OR) {
        // Combine permission filters with search using AND logic
        where.AND = [{ OR: where.OR }, { OR: searchConditions }];
        delete where.OR;
      } else {
        where.OR = searchConditions;
      }
    }

    if (statuses.length > 0) {
      where.status = { in: statuses };
    }

    if (subStatuses.length > 0) {
      where.subStatus = { in: subStatuses };
    }

    if (businessCategories.length > 0) {
      where.businessCategory = { in: businessCategories };
    }

    if (businessIndustries.length > 0) {
      where.businessIndustry = { in: businessIndustries };
    }

    if (cities.length > 0) {
      where.city = { in: cities };
    }

    if (states.length > 0) {
      where.state = { in: states };
    }

    if (assigneeNames.length > 0) {
      where.assignee = {
        name: { in: assigneeNames },
      };
    }

    // Fetch all leads matching the filters (no pagination for export)
    const leads = await prisma.lead.findMany({
      where,
      include: {
        creator: {
          select: { id: true, name: true, username: true },
        },
        assignee: {
          select: { id: true, name: true, username: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Convert to CSV format
    const csvHeaders = [
      "Name",
      "Email",
      "Phone",
      "Company",
      "City",
      "State",
      "Status",
      "Sub Status",
      "Business Category",
      "Business Industry",
      "Assigned To",
      "Created By",
      "Created Date",
      "Updated Date",
    ];

    const csvRows = leads.map((lead) => [
      lead.name || "",
      lead.email || "",
      lead.phone || "",
      lead.company || "",
      lead.city || "",
      lead.state || "",
      lead.status || "",
      lead.subStatus || "",
      lead.businessCategory || "",
      lead.businessIndustry || "",
      lead.assignee?.name || "",
      lead.creator?.name || "",
      format(new Date(lead.createdAt), "dd/MM/yyyy"), // Format date as dd/MM/yyyy
      format(new Date(lead.updatedAt), "dd/MM/yyyy"),
    ]);

    // Combine headers and rows
    const csvContent = [csvHeaders, ...csvRows]
      .map((row) =>
        row.map((field) => `"${String(field).replace(/"/g, '""')}"`).join(",")
      )
      .join("\n");

    // Generate filename with current date and filter info
    const currentDate = new Date().toISOString().split("T")[0];
    let filename = `leads-export-${currentDate}`;

    if (search) {
      filename += `-search-${search.replace(/[^a-zA-Z0-9]/g, "_")}`;
    }
    if (statuses.length > 0) {
      filename += `-status-${statuses.join("_")}`;
    }
    if (assigneeNames.length > 0) {
      filename += `-assignee-${assigneeNames
        .join("_")
        .replace(/[^a-zA-Z0-9_]/g, "_")}`;
    }

    filename += ".csv";

    return new Response(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("Error exporting leads:", error);
    return errorResponse("Failed to export leads", 500);
  }
}
