import { NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { successResponse, errorResponse } from "@/lib/api-response";
import {
  processLeadData,
  processLeadDataPartial,
  processSingleFieldUpdate,
} from "@/lib/lead-data-processor";
import { PermissionManager } from "@/lib/permissions/core";
import { getEffectiveUserForPermissions } from "@/lib/virtual-session-server";
import {
  validateLeadData,
  validateLeadDataPartial,
  validateSingleFieldUpdate,
} from "@/lib/validations/lead-validation";

// Helper function to check if user can access a specific lead
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
    // For now, we'll implement a basic department check
    // This can be enhanced later when the type issues are resolved
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

// GET /api/leads/[id] - Get a specific lead
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

    // Get effective user (supports user impersonation)
    const { userId } = await getEffectiveUserForPermissions(session);

    // Check if user can read this lead
    const canRead = await canAccessLead(userId, leadId, "read");
    if (!canRead) {
      return errorResponse(
        "Forbidden: You don't have permission to view this lead",
        403
      );
    }

    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      include: {
        creator: {
          select: { id: true, name: true, username: true },
        },
        assignee: {
          select: { id: true, name: true, username: true },
        },
        meetings: {
          where: { deletedAt: null }, // Exclude deleted meetings
          include: {
            creator: {
              select: { id: true, name: true, username: true },
            },
          },
          orderBy: { createdAt: "desc" },
        },
        tasks: {
          where: { deletedAt: null }, // Exclude deleted tasks
          include: {
            creator: {
              select: { id: true, name: true, username: true },
            },
          },
          orderBy: { createdAt: "desc" },
        },
        notes: {
          include: {
            creator: {
              select: { id: true, name: true, username: true },
            },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!lead) {
      return errorResponse("Lead not found", 404);
    }

    return successResponse(lead);
  } catch (error) {
    console.error("Error fetching lead:", error);
    return errorResponse("Failed to fetch lead");
  }
}

// PUT /api/leads/[id] - Update a specific lead
export async function PUT(
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

    // Get effective user (supports user impersonation)
    const { userId } = await getEffectiveUserForPermissions(session);

    // Check if user can update this lead
    const canUpdate = await canAccessLead(userId, leadId, "update");
    if (!canUpdate) {
      return errorResponse(
        "Forbidden: You don't have permission to update this lead",
        403
      );
    }

    const body = await request.json();

    // Check if lead exists
    const existingLead = await prisma.lead.findUnique({
      where: { id: leadId },
    });

    if (!existingLead) {
      return errorResponse("Lead not found", 404);
    }

    // Comprehensive validation using Zod (PUT expects complete data)
    const validationResult = validateLeadData(body);

    if (!validationResult.success) {
      // Extract field-specific errors for the frontend
      const validationErrors: Record<string, string> = {};

      validationResult.error.errors.forEach((error) => {
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
          details: validationResult.error.errors,
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Process form data to handle date and numeric fields
    const processedData = processLeadData(validationResult.data);

    const updatedLead = await prisma.lead.update({
      where: { id: leadId },
      data: processedData,
      include: {
        creator: {
          select: { id: true, name: true, username: true },
        },
        assignee: {
          select: { id: true, name: true, username: true },
        },
      },
    });

    return successResponse(updatedLead, "Lead updated successfully");
  } catch (error) {
    console.error("Error updating lead:", error);
    return errorResponse("Failed to update lead");
  }
}

// PATCH /api/leads/[id] - Partial update of a specific lead (for dropdowns, single field updates)
export async function PATCH(
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

    // Get effective user (supports user impersonation)
    const { userId } = await getEffectiveUserForPermissions(session);

    // Check if user can update this lead
    const canUpdate = await canAccessLead(userId, leadId, "update");
    if (!canUpdate) {
      return errorResponse(
        "Forbidden: You don't have permission to update this lead",
        403
      );
    }

    const body = await request.json();

    // Check if lead exists
    const existingLead = await prisma.lead.findUnique({
      where: { id: leadId },
    });

    if (!existingLead) {
      return errorResponse("Lead not found", 404);
    }

    // Detect if this is a single-field update
    const bodyKeys = Object.keys(body);
    const isSingleFieldUpdate = bodyKeys.length === 1;

    let validationResult;
    let processedData;

    if (isSingleFieldUpdate) {
      // For single-field updates, use field-specific validation
      const field = bodyKeys[0];
      const value = body[field];

      validationResult = validateSingleFieldUpdate(field, value);

      if (!validationResult.success) {
        const validationErrors: Record<string, string> = {};
        validationResult.error.errors.forEach((error) => {
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
            details: validationResult.error.errors,
          }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      // For single field updates, use minimal processing
      processedData = processSingleFieldUpdate(field, value);
    } else {
      // For multi-field updates, use regular partial validation
      validationResult = validateLeadDataPartial(body);

      if (!validationResult.success) {
        const validationErrors: Record<string, string> = {};
        validationResult.error.errors.forEach((error) => {
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
            details: validationResult.error.errors,
          }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      processedData = processLeadDataPartial(validationResult.data);
    }

    const updatedLead = await prisma.lead.update({
      where: { id: leadId },
      data: processedData,
      include: {
        creator: {
          select: { id: true, name: true, username: true },
        },
        assignee: {
          select: { id: true, name: true, username: true },
        },
      },
    });

    return successResponse(updatedLead, "Lead updated successfully");
  } catch (error) {
    console.error("Error partially updating lead:", error);
    return errorResponse("Failed to update lead");
  }
}

// DELETE /api/leads/[id] - Delete a specific lead
export async function DELETE(
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

    // Get effective user (supports user impersonation)
    const { userId } = await getEffectiveUserForPermissions(session);

    // Check if user can delete this lead
    const canDelete = await canAccessLead(userId, leadId, "delete");
    if (!canDelete) {
      return errorResponse(
        "Forbidden: You don't have permission to delete this lead",
        403
      );
    }

    // Check if lead exists
    const existingLead = await prisma.lead.findUnique({
      where: { id: leadId },
    });

    if (!existingLead) {
      return errorResponse("Lead not found", 404);
    }

    await prisma.lead.delete({
      where: { id: leadId },
    });

    return successResponse(null, "Lead deleted successfully");
  } catch (error) {
    console.error("Error deleting lead:", error);
    return errorResponse("Failed to delete lead");
  }
}
