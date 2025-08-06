import { NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { successResponse, errorResponse } from "@/lib/api-response";
import { PermissionManager } from "@/lib/permissions/core";
import { getEffectiveUserForPermissions } from "@/lib/virtual-session-server";

// Helper function to check if user can access a specific lead (shared logic)
async function canAccessLead(
  userId: number,
  leadId: number,
  action: "read" | "update" | "delete"
): Promise<boolean> {
  // Check global permission
  const hasGlobalPermission = await PermissionManager.hasPermission(
    userId,
    `leads.${action}.all` as any
  );
  if (hasGlobalPermission) {
    return true;
  }

  // Get the lead basic info
  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    select: {
      id: true,
      assign: true,
      createdBy: true,
    },
  });

  if (!lead) {
    return false;
  }

  // Check assigned permission (if lead is assigned to user or created by user)
  const hasAssignedPermission = await PermissionManager.hasPermission(
    userId,
    `leads.${action}.assigned` as any
  );
  if (hasAssignedPermission) {
    if (lead.assign === userId || lead.createdBy === userId) {
      return true;
    }
  }

  // Check department permission (simplified for now)
  const hasDepartmentPermission = await PermissionManager.hasPermission(
    userId,
    `leads.${action}.department` as any
  );
  if (hasDepartmentPermission) {
    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true },
    });

    // Managers and above can access department leads for now
    if (currentUser?.role === "Manager" || currentUser?.role === "Admin") {
      return true;
    }
  }

  return false;
}

// POST /api/leads/[id]/notes - Create a new note for a lead
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return errorResponse("Unauthorized", 401);
    }

    const resolvedParams = await params;
    const leadId = parseInt(resolvedParams.id);
    if (isNaN(leadId)) {
      return errorResponse("Invalid lead ID", 400);
    }

    // Get effective user (supports virtual users)
    const { userId } = await getEffectiveUserForPermissions(session);

    // Check if user can access this lead (need read access to the lead)
    const canAccessLeadForNotes = await canAccessLead(userId, leadId, "read");
    if (!canAccessLeadForNotes) {
      return errorResponse(
        "Forbidden: You don't have access to this lead",
        403
      );
    }

    // Check if user has permission to create notes
    const canCreateNotes = await PermissionManager.hasPermission(
      userId,
      "notes.create"
    );
    if (!canCreateNotes) {
      return errorResponse(
        "Forbidden: You don't have permission to create notes",
        403
      );
    }

    const body = await request.json();
    const { subject, description, type } = body;

    // Validate required fields
    if (!subject || !description) {
      return errorResponse("Subject and description are required", 400);
    }

    // Check if lead exists
    const leadExists = await prisma.lead.findUnique({
      where: { id: leadId },
      select: { id: true },
    });

    if (!leadExists) {
      return errorResponse("Lead not found", 404);
    }

    // Create the note
    const note = await prisma.note.create({
      data: {
        subject,
        description,
        type: type || "General",
        leadId,
        createdBy: userId,
      },
      include: {
        creator: {
          select: { id: true, name: true, username: true },
        },
      },
    });

    return successResponse(note, "Note created successfully");
  } catch (error) {
    console.error("Error creating note:", error);
    return errorResponse("Failed to create note", 500);
  }
}

// GET /api/leads/[id]/notes - Get all notes for a lead
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return errorResponse("Unauthorized", 401);
    }

    const resolvedParams = await params;
    const leadId = parseInt(resolvedParams.id);
    if (isNaN(leadId)) {
      return errorResponse("Invalid lead ID", 400);
    }

    // Get effective user (supports virtual users)
    const { userId } = await getEffectiveUserForPermissions(session);

    // Check if user can access this lead (need read access to the lead)
    const canAccessLeadForNotes = await canAccessLead(userId, leadId, "read");
    if (!canAccessLeadForNotes) {
      return errorResponse(
        "Forbidden: You don't have access to this lead",
        403
      );
    }

    // Check if user has permission to read notes
    const hasReadAllNotes = await PermissionManager.hasPermission(
      userId,
      "notes.read.all"
    );
    const hasReadAssignedNotes = await PermissionManager.hasPermission(
      userId,
      "notes.read.assigned"
    );
    const hasReadDepartmentNotes = await PermissionManager.hasPermission(
      userId,
      "notes.read.department"
    );

    if (!hasReadAllNotes && !hasReadAssignedNotes && !hasReadDepartmentNotes) {
      return errorResponse(
        "Forbidden: You don't have permission to read notes",
        403
      );
    }

    // Check if lead exists
    const leadExists = await prisma.lead.findUnique({
      where: { id: leadId },
      select: { id: true },
    });

    if (!leadExists) {
      return errorResponse("Lead not found", 404);
    }

    // Apply note filtering based on permissions
    let noteFilter: any = { leadId };

    if (!hasReadAllNotes) {
      const permissionFilters = [];

      if (hasReadAssignedNotes) {
        // Can read notes created by them
        permissionFilters.push({ createdBy: userId });
      }

      if (hasReadDepartmentNotes) {
        // For now, managers can read all notes in accessible leads
        const currentUser = await prisma.user.findUnique({
          where: { id: userId },
          select: { role: true },
        });

        if (currentUser?.role === "Manager" || currentUser?.role === "Admin") {
          // Managers can read all notes for leads they can access
          permissionFilters.push({ leadId }); // This will allow all notes for this lead
        }
      }

      if (permissionFilters.length > 0) {
        noteFilter.OR = permissionFilters;
      } else {
        // No permission to read any notes
        return successResponse([]);
      }
    }

    // Get notes based on permission filtering
    const notes = await prisma.note.findMany({
      where: noteFilter,
      include: {
        creator: {
          select: { id: true, name: true, username: true },
        },
      },
      orderBy: [
        { isPinned: "desc" }, // Pinned notes first
        { createdAt: "desc" }, // Then by creation date
      ],
    });

    return successResponse(notes);
  } catch (error) {
    console.error("Error fetching notes:", error);
    return errorResponse("Failed to fetch notes", 500);
  }
}
