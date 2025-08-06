import { NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { successResponse, errorResponse } from "@/lib/api-response";

// GET /api/notes - Get all notes
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

    const notes = await prisma.note.findMany({
      where,
      include: {
        lead: {
          select: { id: true, name: true, company: true },
        },
        creator: {
          select: { id: true, name: true, username: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return successResponse(notes);
  } catch (error) {
    console.error("Error fetching notes:", error);
    return errorResponse("Failed to fetch notes");
  }
}

// POST /api/notes - Create a new note
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return errorResponse("Unauthorized", 401);
    }

    const body = await request.json();

    // Basic validation
    if (!body.subject || !body.description || !body.leadId) {
      return errorResponse(
        "Subject, description, and lead ID are required",
        400
      );
    }

    const note = await prisma.note.create({
      data: {
        ...body,
        createdBy: parseInt((session as { user: { id: string } }).user.id),
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

    return successResponse(note, "Note created successfully");
  } catch (error) {
    console.error("Error creating note:", error);
    return errorResponse("Failed to create note");
  }
}
