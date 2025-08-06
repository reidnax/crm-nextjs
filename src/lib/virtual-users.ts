/**
 * Virtual Test User System
 * Creates temporary "virtual" users for authentic role testing without database pollution
 */

export interface VirtualUser {
  id: number;
  name: string;
  email: string;
  username: string;
  role: string;
  department: string | null;
  active: boolean;
  isVirtual: true;
}

/**
 * Virtual test users with high IDs to avoid conflicts
 * These IDs are chosen to be outside normal user ID ranges
 */
export const VIRTUAL_TEST_USERS: Record<string, VirtualUser> = {
  assignee: {
    id: 999997,
    name: "Virtual Assignee",
    email: "virtual-assignee@dev.test",
    username: "virtual-assignee",
    role: "Assignee",
    department: "Sales",
    active: true,
    isVirtual: true,
  },
  manager: {
    id: 999998,
    name: "Virtual Manager",
    email: "virtual-manager@dev.test",
    username: "virtual-manager",
    role: "Manager",
    department: "Sales",
    active: true,
    isVirtual: true,
  },
  admin: {
    id: 999999,
    name: "Virtual Admin",
    email: "virtual-admin@dev.test",
    username: "virtual-admin",
    role: "Admin",
    department: null,
    active: true,
    isVirtual: true,
  },
};

/**
 * Get virtual user by role
 */
export function getVirtualUser(role: string): VirtualUser | null {
  const key = role.toLowerCase();
  return VIRTUAL_TEST_USERS[key] || null;
}

/**
 * Get virtual user by ID
 */
export function getVirtualUserById(id: number): VirtualUser | null {
  return (
    Object.values(VIRTUAL_TEST_USERS).find((user) => user.id === id) || null
  );
}

/**
 * Check if a user ID is virtual
 */
export function isVirtualUserId(id: number): boolean {
  return id >= 999997 && id <= 999999;
}

/**
 * Get all virtual user roles
 */
export function getVirtualUserRoles(): string[] {
  return Object.values(VIRTUAL_TEST_USERS).map((user) => user.role);
}

/**
 * Smart data assignment for virtual users
 * Determines which existing data should be "assigned" to virtual users
 */
export interface DataAssignment {
  leadIds: number[];
  meetingIds: number[];
  taskIds: number[];
  noteIds: number[];
}

export class VirtualDataAssigner {
  private static assignments: Map<number, DataAssignment> = new Map();

  /**
   * Get data assignment for a virtual user
   */
  static async getAssignment(virtualUserId: number): Promise<DataAssignment> {
    if (this.assignments.has(virtualUserId)) {
      return this.assignments.get(virtualUserId)!;
    }

    // Generate new assignment
    const assignment = await this.generateAssignment(virtualUserId);
    this.assignments.set(virtualUserId, assignment);
    return assignment;
  }

  /**
   * Generate data assignment for virtual user
   */
  private static async generateAssignment(
    virtualUserId: number
  ): Promise<DataAssignment> {
    const { prisma } = await import("@/lib/prisma");

    try {
      // Get sample data from database
      const [leads, meetings, tasks, notes] = await Promise.all([
        prisma.lead.findMany({ take: 10, select: { id: true } }),
        prisma.meeting.findMany({ take: 5, select: { id: true } }),
        prisma.task.findMany({ take: 8, select: { id: true } }),
        prisma.note.findMany({ take: 6, select: { id: true } }),
      ]);

      // Assign different data based on virtual user role
      const virtualUser = getVirtualUserById(virtualUserId);
      if (!virtualUser) {
        return { leadIds: [], meetingIds: [], taskIds: [], noteIds: [] };
      }

      let assignedLeads = leads.slice(0, 5); // Default assignment

      if (virtualUser.role === "Assignee") {
        // Assignee gets fewer leads
        assignedLeads = leads.slice(0, 3);
      } else if (virtualUser.role === "Manager") {
        // Manager gets more leads
        assignedLeads = leads.slice(0, 7);
      } else if (virtualUser.role === "Admin") {
        // Admin gets all leads (but we'll handle this in API logic)
        assignedLeads = leads;
      }

      return {
        leadIds: assignedLeads.map((l) => l.id),
        meetingIds: meetings
          .slice(0, Math.min(3, meetings.length))
          .map((m) => m.id),
        taskIds: tasks.slice(0, Math.min(5, tasks.length)).map((t) => t.id),
        noteIds: notes.slice(0, Math.min(4, notes.length)).map((n) => n.id),
      };
    } catch (error) {
      console.error("Error generating virtual user assignment:", error);
      return { leadIds: [], meetingIds: [], taskIds: [], noteIds: [] };
    }
  }

  /**
   * Clear assignments (for dev mode reset)
   */
  static clearAssignments(): void {
    this.assignments.clear();
  }

  /**
   * Get lead filter for virtual user
   */
  static async getLeadFilter(virtualUserId: number): Promise<any> {
    const assignment = await this.getAssignment(virtualUserId);
    const virtualUser = getVirtualUserById(virtualUserId);

    if (!virtualUser) return {};

    if (virtualUser.role === "Admin") {
      // Admin sees all leads
      return {};
    }

    if (virtualUser.role === "Manager") {
      // Manager sees department leads + assigned leads
      return {
        OR: [
          { id: { in: assignment.leadIds } }, // "Assigned" to virtual user
          { assign: { in: [999997, 999998] } }, // Department members (virtual users)
        ],
      };
    }

    if (virtualUser.role === "Assignee") {
      // Assignee sees only assigned leads
      return {
        OR: [
          { id: { in: assignment.leadIds } }, // "Assigned" leads
          { createdBy: virtualUserId }, // Created by virtual user (none exist, but for completeness)
        ],
      };
    }

    return {};
  }
}
