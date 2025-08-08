import { NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { successResponse, errorResponse } from "@/lib/api-response";
import { PermissionManager } from "@/lib/permissions/core";
import { getEffectiveUserForPermissions } from "@/lib/virtual-session-server";

async function canAccessLead(
  userId: number,
  leadId: number,
  action: "read" | "update" | "delete"
): Promise<boolean> {
  const hasGlobalPermission = await PermissionManager.hasPermission(
    userId,
    `leads.${action}.all` as any
  );
  if (hasGlobalPermission) return true;

  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    select: { id: true, assign: true, createdBy: true },
  });
  if (!lead) return false;

  const hasAssignedPermission = await PermissionManager.hasPermission(
    userId,
    `leads.${action}.assigned` as any
  );
  if (
    hasAssignedPermission &&
    (lead.assign === userId || lead.createdBy === userId)
  ) {
    return true;
  }

  const hasDepartmentPermission = await PermissionManager.hasPermission(
    userId,
    `leads.${action}.department` as any
  );
  if (hasDepartmentPermission) {
    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });
    if (currentUser?.role === "Manager" || currentUser?.role === "Admin") {
      return true;
    }
  }

  return false;
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; meetingId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return errorResponse("Unauthorized", 401);
    const { id, meetingId } = await params;
    const leadId = parseInt(id);
    const mId = parseInt(meetingId);
    if (isNaN(leadId) || isNaN(mId)) return errorResponse("Invalid IDs", 400);
    const { userId } = await getEffectiveUserForPermissions(session);

    const canUpdateAll = await PermissionManager.hasPermission(
      userId,
      "meetings.update.all"
    );
    const canUpdateAssigned = await PermissionManager.hasPermission(
      userId,
      "meetings.update.assigned"
    );

    const existing = await prisma.meeting.findFirst({
      where: { id: mId, leadId },
    });
    if (!existing) return errorResponse("Meeting not found", 404);
    if (
      !canUpdateAll &&
      !(canUpdateAssigned && existing.createdBy === userId)
    ) {
      return errorResponse("Forbidden", 403);
    }

    const body = await request.json();
    const { subject, description, startTime, endTime, location, type, status } =
      body as Record<string, unknown>;
    if (startTime && endTime) {
      const start = new Date(String(startTime));
      const end = new Date(String(endTime));
      if (!(end > start))
        return errorResponse("End time must be after start time", 400);
      const conflict = await prisma.meeting.findFirst({
        where: {
          id: { not: mId },
          leadId,
          deletedAt: null, // CRITICAL: Don't consider deleted meetings for conflicts
          status: { not: "Cancelled" },
          OR: [
            { startTime: { lt: end }, endTime: { gt: start } },
            { startTime: { gte: start, lt: end } },
            { endTime: { gt: start, lte: end } },
          ],
        },
        select: { id: true },
      });
      if (conflict)
        return errorResponse("Time conflict with another meeting", 409);
    }

    const updated = await prisma.meeting.update({
      where: { id: mId },
      data: {
        ...(subject !== undefined ? { subject: String(subject) } : {}),
        ...(description !== undefined
          ? { description: String(description) }
          : {}),
        ...(startTime !== undefined
          ? { startTime: new Date(String(startTime)) }
          : {}),
        ...(endTime !== undefined
          ? { endTime: new Date(String(endTime)) }
          : {}),
        ...(location !== undefined ? { location: String(location) } : {}),
        ...(type !== undefined ? { type: String(type) } : {}),
        ...(status !== undefined ? { status: String(status) } : {}),
      },
      include: {
        creator: { select: { id: true, name: true, username: true } },
      },
    });
    return successResponse(updated, "Meeting updated successfully");
  } catch (error) {
    console.error("Error updating meeting:", error);
    return errorResponse("Failed to update meeting", 500);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; meetingId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return errorResponse("Unauthorized", 401);
    const { id, meetingId } = await params;
    const leadId = parseInt(id);
    const mId = parseInt(meetingId);
    if (isNaN(leadId) || isNaN(mId)) return errorResponse("Invalid IDs", 400);
    const { userId } = await getEffectiveUserForPermissions(session);

    const existing = await prisma.meeting.findFirst({
      where: { id: mId, leadId },
    });
    if (!existing) return errorResponse("Meeting not found", 404);

    const canDeleteAll = await PermissionManager.hasPermission(
      userId,
      "meetings.delete.all"
    );
    const canDeleteAssigned = await PermissionManager.hasPermission(
      userId,
      "meetings.delete.assigned"
    );
    if (
      !canDeleteAll &&
      !(canDeleteAssigned && existing.createdBy === userId)
    ) {
      return errorResponse("Forbidden", 403);
    }

    await prisma.meeting.update({
      where: { id: mId },
      data: {
        deletedAt: new Date(),
        deletedBy: userId,
      },
    });
    return successResponse(null, "Meeting deleted successfully");
  } catch (error) {
    console.error("Error deleting meeting:", error);
    return errorResponse("Failed to delete meeting", 500);
  }
}
