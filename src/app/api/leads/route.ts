import { NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { successResponse, errorResponse } from "@/lib/api-response";
import { processLeadData } from "@/lib/lead-data-processor";
import { PermissionManager } from "@/lib/permissions/core";
import { getEffectiveUserForPermissions } from "@/lib/virtual-session-server";
import { validateLeadData } from "@/lib/validations/lead-validation";

// GET /api/leads - Get all leads with filtering and pagination
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return errorResponse("Unauthorized", 401);
    }

    const { searchParams } = new URL(request.url);
    const page = searchParams.get("page");
    const pageSize = searchParams.get("pageSize");

    // Filter and search parameters
    const search = searchParams.get("search");
    const statuses = searchParams.getAll("status");
    const subStatuses = searchParams.getAll("subStatus");
    const priorities = searchParams.getAll("priority");
    const assigneeNames = searchParams.getAll("assignee");
    const businessCategories = searchParams.getAll("businessCategory");
    const businessIndustries = searchParams.getAll("businessIndustry");
    const cities = searchParams.getAll("city");
    const states = searchParams.getAll("state");
    const assign = searchParams.get("assign");
    const sortBy = searchParams.get("sortBy") || "createdAt";
    const sortOrder = searchParams.get("sortOrder") || "desc";

    // Get effective user (considers user impersonation)
    const { userId, userRole, isVirtual } =
      await getEffectiveUserForPermissions(session);

    if (isVirtual) {
      console.log(
        `Using impersonated user: ${userRole} (ID: ${userId}) for Admin-Dev ${
          session?.user?.id ?? "unknown"
        }`
      );
    }

    // Apply permission-based filtering
    const hasViewAllLeads = await PermissionManager.hasPermission(
      userId,
      "leads.read.all"
    );
    const hasViewDepartmentLeads = await PermissionManager.hasPermission(
      userId,
      "leads.read.department"
    );
    const hasViewAssignedLeads = await PermissionManager.hasPermission(
      userId,
      "leads.read.assigned"
    );

    // Build where clause
    const where: Record<string, unknown> = {};

    // Apply permission-based lead filtering
    if (!hasViewAllLeads) {
      const permissionFilters = [];

      if (hasViewAssignedLeads) {
        // Can view leads assigned to them or created by them
        permissionFilters.push({ assign: userId }, { createdBy: userId });
      }

      if (hasViewDepartmentLeads) {
        // Get user's department and add department-based filtering
        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: { department: true },
        });

        if (user?.department) {
          permissionFilters.push({
            OR: [
              {
                assignee: {
                  department: user.department,
                },
              },
              {
                creator: {
                  department: user.department,
                },
              },
            ],
          });
        }
      }

      if (permissionFilters.length > 0) {
        where.OR = permissionFilters;
      } else {
        // No permission to view any leads
        return successResponse({
          leads: [],
          totalCount: 0,
          currentPage: parseInt(page || "1"),
          totalPages: 0,
        });
      }
    }

    // Global search across multiple fields
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
        { assignee: { name: { contains: search, mode: "insensitive" } } },
      ];

      if (where.OR) {
        // Combine permission filters with search using AND logic
        where.AND = [{ OR: where.OR }, { OR: searchConditions }];
        delete where.OR;
      } else {
        where.OR = searchConditions;
      }
    }

    // Apply filters
    if (statuses.length > 0) {
      where.status = { in: statuses };
    }

    if (subStatuses.length > 0) {
      where.subStatus = { in: subStatuses };
    }

    if (priorities.length > 0) {
      where.priority = { in: priorities };
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

    if (assign) {
      where.assign = parseInt(assign);
    }

    // Pagination
    let paginationOptions: Record<string, unknown> = {};
    if (page && pageSize) {
      const offset = (parseInt(page) - 1) * parseInt(pageSize);
      paginationOptions = {
        skip: offset,
        take: parseInt(pageSize),
      };
    }

    // Execute query
    const [leads, total, assignees] = await Promise.all([
      prisma.lead.findMany({
        where,
        include: {
          creator: {
            select: { id: true, name: true, username: true },
          },
          assignee: {
            select: { id: true, name: true, username: true },
          },
          meetings: true,
          tasks: true,
          notes: true,
        },
        ...paginationOptions,
        orderBy: { [sortBy]: sortOrder === "desc" ? "desc" : "asc" },
      }),
      prisma.lead.count({ where }),
      // Fetch all unique assignees for filter options
      prisma.user.findMany({
        where: {
          assignedLeads: {
            some: {},
          },
        },
        select: { id: true, name: true },
        distinct: ["id"],
      }),
    ]);

    return successResponse({
      leads,
      assignees,
      pagination: {
        total,
        page: page ? parseInt(page) : 1,
        pageSize: pageSize ? parseInt(pageSize) : total,
        totalPages: pageSize ? Math.ceil(total / parseInt(pageSize)) : 1,
      },
    });
  } catch (error) {
    console.error("Error fetching leads:", error);
    return errorResponse("Failed to fetch leads");
  }
}

// POST /api/leads - Create a new lead
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return errorResponse("Unauthorized", 401);
    }

    // Get effective user (supports user impersonation)
    const { userId } = await getEffectiveUserForPermissions(session);

    // Check if user has permission to create leads
    const canCreateLeads = await PermissionManager.hasPermission(
      userId,
      "leads.create"
    );
    if (!canCreateLeads) {
      return errorResponse(
        "Forbidden: You don't have permission to create leads",
        403
      );
    }

    const body = await request.json();

    // Comprehensive validation using Zod
    const validationResult = validateLeadData(body);

    if (!validationResult.success) {
      // Extract field-specific errors for the frontend
      const validationErrors: Record<string, string> = {};

      validationResult.error.issues.forEach((error) => {
        const fieldPath = error.path.join(".");
        if (!validationErrors[fieldPath]) {
          validationErrors[fieldPath] = error.message;
        }
      });

      return new Response(
        JSON.stringify({
          success: false,
          error: "Validation failed",
          validationErrors,
          details: validationResult.error.issues,
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Process form data to handle date and numeric fields
    const processedData = processLeadData(validationResult.data);

    const lead = await prisma.lead.create({
      data: {
        name: processedData.name,
        ...processedData,
        createdBy: userId,
      },
      include: {
        creator: {
          select: { id: true, name: true, username: true },
        },
        assignee: {
          select: { id: true, name: true, username: true },
        },
      },
    });

    return successResponse(lead, "Lead created successfully");
  } catch (error) {
    console.error("Error creating lead:", error);
    return errorResponse("Failed to create lead");
  }
}
