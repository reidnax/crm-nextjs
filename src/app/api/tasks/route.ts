import { NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { successResponse, errorResponse } from "@/lib/api-response";

// GET /api/tasks - Get all tasks
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return errorResponse("Unauthorized", 401);
    }

    const { searchParams } = new URL(request.url);
    const leadId = searchParams.get("leadId");

    const where: Record<string, unknown> = {};
    if (leadId) {
      where.leadId = parseInt(leadId);
    }

    const tasks = await prisma.task.findMany({
      where,
      include: {
        lead: {
          select: { id: true, name: true, company: true },
        },
        creator: {
          select: { id: true, name: true, username: true },
        },
      },
      orderBy: { dueDate: "asc" },
    });

    return successResponse(tasks);
  } catch (error) {
    console.error("Error fetching tasks:", error);
    return errorResponse("Failed to fetch tasks");
  }
}

// POST /api/tasks - Create a new task
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return errorResponse("Unauthorized", 401);
    }

    const body = await request.json();

    // Basic validation
    if (!body.subject || !body.dueDate || !body.leadId) {
      return errorResponse("Subject, due date, and lead ID are required", 400);
    }

    const task = await prisma.task.create({
      data: {
        ...body,
        createdBy: parseInt((session as { user: { id: string } }).user.id),
        dueDate: new Date(body.dueDate),
      },
      include: {
        lead: {
          select: { id: true, name: true, company: true },
        },
        creator: {
          select: { id: true, name: true, username: true },
        },
      },
    });

    return successResponse(task, "Task created successfully");
  } catch (error) {
    console.error("Error creating task:", error);
    return errorResponse("Failed to create task");
  }
}
