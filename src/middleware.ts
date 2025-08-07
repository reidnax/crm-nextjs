import { withAuth } from "next-auth/middleware";

export default withAuth(
  function middleware(req) {
    // Additional middleware logic can be added here if needed
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        // If trying to access login page and already authenticated, redirect to dashboard
        if (req.nextUrl.pathname === "/login" && token) {
          return false;
        }

        // Protect all routes except login and the root path
        if (req.nextUrl.pathname !== "/login" && req.nextUrl.pathname !== "/") {
          return !!token;
        }

        return true;
      },
    },
  }
);

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
