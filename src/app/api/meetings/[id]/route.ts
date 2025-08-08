import { NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { successResponse, errorResponse } from "@/lib/api-response";
import { PermissionManager } from "@/lib/permissions/core";
import { getEffectiveUserForPermissions } from "@/lib/virtual-session-server";
import { format } from "date-fns";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return errorResponse("Unauthorized", 401);
    const { id } = await params;
    const meetingId = parseInt(id);
    if (isNaN(meetingId)) return errorResponse("Invalid meeting ID", 400);

    const { userId } = await getEffectiveUserForPermissions(session);
    const canUpdateAll = await PermissionManager.hasPermission(
      userId,
      "meetings.update.all"
    );
    const canUpdateAssigned = await PermissionManager.hasPermission(
      userId,
      "meetings.update.assigned"
    );

    const existing = await prisma.meeting.findUnique({
      where: { id: meetingId },
    });
    if (!existing) return errorResponse("Meeting not found", 404);
    if (
      !canUpdateAll &&
      !(canUpdateAssigned && existing.createdBy === userId)
    ) {
      return errorResponse("Forbidden", 403);
    }

    const body = await request.json();
    const {
      subject,
      description,
      startTime,
      endTime,
      location,
      type,
      status,
      priority,
      agenda,
      outcome,
      attendees,
      isRecurring,
      leadId,
    } = body as Record<string, unknown>;

    if (startTime && endTime) {
      const start = new Date(String(startTime));
      const end = new Date(String(endTime));
      if (!(end > start))
        return errorResponse("End time must be after start time", 400);

      // Use the new leadId if provided, otherwise use the existing one
      const targetLeadId =
        leadId !== undefined ? Number(leadId) : existing.leadId;

      const conflict = await prisma.meeting.findFirst({
        where: {
          id: { not: meetingId },
          leadId: targetLeadId,
          deletedAt: null, // CRITICAL: Don't consider deleted meetings for conflicts
          status: { not: "Cancelled" },
          OR: [
            { startTime: { lt: end }, endTime: { gt: start } },
            { startTime: { gte: start, lt: end } },
            { endTime: { gt: start, lte: end } },
          ],
        },
        select: {
          id: true,
          subject: true,
          startTime: true,
          endTime: true,
        },
      });

      if (conflict) {
        const conflictStart = format(
          new Date(conflict.startTime),
          "dd/MM/yyyy HH:mm"
        );
        const conflictEnd = format(
          new Date(conflict.endTime),
          "dd/MM/yyyy HH:mm"
        );
        const newStart = format(start, "dd/MM/yyyy HH:mm");
        const newEnd = format(end, "dd/MM/yyyy HH:mm");

        return errorResponse(
          `Time conflict detected! The meeting "${conflict.subject}" is already scheduled from ${conflictStart} to ${conflictEnd}, which overlaps with your requested time (${newStart} to ${newEnd}). Please choose a different time slot.`,
          409
        );
      }
    }

    // Calculate duration if both start and end times are provided
    let duration: number | undefined;
    if (startTime && endTime) {
      const start = new Date(String(startTime));
      const end = new Date(String(endTime));
      duration = Math.round((end.getTime() - start.getTime()) / (1000 * 60));
    }

    const updated = await prisma.meeting.update({
      where: { id: meetingId },
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
        ...(duration !== undefined ? { duration } : {}),
        ...(location !== undefined ? { location: String(location) } : {}),
        ...(type !== undefined ? { type: String(type) } : {}),
        ...(status !== undefined ? { status: String(status) } : {}),
        ...(priority !== undefined ? { priority: String(priority) } : {}),
        ...(agenda !== undefined ? { agenda: String(agenda) } : {}),
        ...(outcome !== undefined ? { outcome: String(outcome) } : {}),
        ...(attendees !== undefined
          ? { attendees: attendees as string[] }
          : {}),
        ...(isRecurring !== undefined
          ? { isRecurring: Boolean(isRecurring) }
          : {}),
        ...(leadId !== undefined ? { leadId: Number(leadId) } : {}),
      },
      include: {
        lead: { select: { id: true, name: true, company: true } },
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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return errorResponse("Unauthorized", 401);
    const { id } = await params;
    const meetingId = parseInt(id);
    if (isNaN(meetingId)) return errorResponse("Invalid meeting ID", 400);

    const { userId } = await getEffectiveUserForPermissions(session);
    const canDeleteAll = await PermissionManager.hasPermission(
      userId,
      "meetings.delete.all"
    );
    const canDeleteAssigned = await PermissionManager.hasPermission(
      userId,
      "meetings.delete.assigned"
    );

    const existing = await prisma.meeting.findUnique({
      where: { id: meetingId },
    });
    if (!existing) return errorResponse("Meeting not found", 404);
    if (
      !canDeleteAll &&
      !(canDeleteAssigned && existing.createdBy === userId)
    ) {
      return errorResponse("Forbidden", 403);
    }

    await prisma.meeting.update({
      where: { id: meetingId },
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
