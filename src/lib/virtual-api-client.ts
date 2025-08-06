/**
 * Virtual API Client
 * Handles API calls with virtual user context for authentic testing
 */

import {
  VirtualDataAssigner,
  isVirtualUserId,
  getVirtualUserById,
} from "./virtual-users";

/**
 * Enhanced fetch that handles virtual user data filtering
 */
export async function virtualFetch(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  // Get the original response
  const response = await fetch(input, init);

  if (!response.ok) {
    return response;
  }

  // Check if we're dealing with a virtual user session
  const url = typeof input === "string" ? input : input.toString();

  // Only process specific API endpoints that need virtual filtering
  if (shouldFilterResponse(url)) {
    const data = await response.json();
    const filteredData = await filterResponseForVirtualUser(url, data);

    // Create new response with filtered data
    return new Response(JSON.stringify(filteredData), {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    });
  }

  return response;
}

/**
 * Check if URL should be filtered for virtual users
 */
function shouldFilterResponse(url: string): boolean {
  const filterableEndpoints = [
    "/api/leads",
    "/api/meetings",
    "/api/tasks",
    "/api/notes",
    "/api/team",
    "/api/dashboard",
  ];

  return filterableEndpoints.some((endpoint) => url.includes(endpoint));
}

/**
 * Filter API response data for virtual users
 */
async function filterResponseForVirtualUser(
  url: string,
  data: any
): Promise<any> {
  // Get virtual user context from the current dev mode state
  const { getDevModeState } = await import("@/contexts/DevModeContext");
  // Note: We'll need to implement getDevModeState or use a different approach

  // For now, let's implement a simpler approach using URL params or headers
  // This will be enhanced when we integrate with the session system

  if (url.includes("/api/leads")) {
    return filterLeadsResponse(data);
  }

  if (url.includes("/api/team")) {
    return filterTeamResponse(data);
  }

  if (url.includes("/api/dashboard")) {
    return filterDashboardResponse(data);
  }

  return data;
}

/**
 * Filter leads response for virtual users
 */
async function filterLeadsResponse(data: any): Promise<any> {
  // This will be called when virtual user is active
  // For now, return original data - we'll enhance this when session integration is complete
  return data;
}

/**
 * Filter team response for virtual users
 */
async function filterTeamResponse(data: any): Promise<any> {
  // Virtual users shouldn't see other virtual users in team list
  if (data.users) {
    data.users = data.users.filter((user: any) => !isVirtualUserId(user.id));
  }

  return data;
}

/**
 * Filter dashboard response for virtual users
 */
async function filterDashboardResponse(data: any): Promise<any> {
  // Adjust dashboard stats based on virtual user permissions
  return data;
}

/**
 * Utility to get virtual user context from request
 * This will be used by API routes to detect virtual user context
 */
export function getVirtualUserFromHeaders(
  request: Request
): { id: number; role: string } | null {
  const virtualUserId = request.headers.get("X-Virtual-User-Id");
  const virtualUserRole = request.headers.get("X-Virtual-User-Role");

  if (virtualUserId && virtualUserRole) {
    return {
      id: parseInt(virtualUserId),
      role: virtualUserRole,
    };
  }

  return null;
}

/**
 * Add virtual user headers to request
 */
export function addVirtualUserHeaders(
  headers: Headers,
  virtualUserId: number,
  virtualUserRole: string
): void {
  headers.set("X-Virtual-User-Id", virtualUserId.toString());
  headers.set("X-Virtual-User-Role", virtualUserRole);
  headers.set("X-Virtual-Mode", "true");
}
