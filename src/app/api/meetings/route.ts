import { NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { successResponse, errorResponse } from "@/lib/api-response";

// GET /api/meetings - Get all meetings
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

    const meetings = await prisma.meeting.findMany({
      where,
      include: {
        lead: {
          select: { id: true, name: true, company: true },
        },
        creator: {
          select: { id: true, name: true, username: true },
        },
      },
      orderBy: { startTime: "asc" },
    });

    return successResponse(meetings);
  } catch (error) {
    console.error("Error fetching meetings:", error);
    return errorResponse("Failed to fetch meetings");
  }
}

// POST /api/meetings - Create a new meeting
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return errorResponse("Unauthorized", 401);
    }

    const body = await request.json();

    // Basic validation
    if (!body.subject || !body.startTime || !body.endTime || !body.leadId) {
      return errorResponse(
        "Subject, start time, end time, and lead ID are required",
        400
      );
    }

    const meeting = await prisma.meeting.create({
      data: {
        ...body,
        createdBy: parseInt((session as { user: { id: string } }).user.id),
        startTime: new Date(body.startTime),
        endTime: new Date(body.endTime),
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

    return successResponse(meeting, "Meeting created successfully");
  } catch (error) {
    console.error("Error creating meeting:", error);
    return errorResponse("Failed to create meeting");
  }
}
