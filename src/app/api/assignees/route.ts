import { NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { successResponse, errorResponse } from "@/lib/api-response";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return errorResponse("Unauthorized", 401);
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");
    const page = searchParams.get("page") || "1";
    const pageSize = searchParams.get("pageSize") || "10";

    const where: Record<string, unknown> = {
      assignedLeads: {
        some: {}, // Users who have at least one assigned lead
      },
    };

    // Add search functionality
    if (search && search.trim() !== "") {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { username: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ];
    }

    // Pagination
    const offset = (parseInt(page) - 1) * parseInt(pageSize);
    const paginationOptions = {
      skip: offset,
      take: parseInt(pageSize),
    };

    const [assignees, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          username: true,
          email: true,
          _count: {
            select: {
              assignedLeads: true,
            },
          },
        },
        orderBy: [{ name: "asc" }],
        ...paginationOptions,
      }),
      prisma.user.count({ where }),
    ]);

    const totalPages = Math.ceil(total / parseInt(pageSize));

    return successResponse({
      assignees,
      pagination: {
        total,
        page: parseInt(page),
        pageSize: parseInt(pageSize),
        totalPages,
      },
    });
  } catch (error) {
    console.error("Error fetching assignees:", error);
    return errorResponse("Failed to fetch assignees", 500);
  }
}
