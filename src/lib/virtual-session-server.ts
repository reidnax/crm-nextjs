/**
 * Server-side session utilities for user impersonation
 * Handles effective user context for API permission checks
 */

/**
 * Get effective user for permission checks, considering impersonation
 * This supports the dev mode user impersonation functionality
 */
export async function getEffectiveUserForPermissions(session: any): Promise<{
  userId: number;
  userRole: string;
  isVirtual: boolean;
}> {
  if (!session?.user?.id) {
    throw new Error("No valid session");
  }

  // Check if we're currently impersonating a user
  const isImpersonated = session.user.isImpersonated || false;

  if (isImpersonated) {
    // Return the impersonated user's info
    return {
      userId: parseInt(session.user.id),
      userRole: session.user.role,
      isVirtual: true, // This indicates we're impersonating
    };
  }

  // Return the real user's info
  return {
    userId: parseInt(session.user.id),
    userRole: session.user.role,
    isVirtual: false,
  };
}
