import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Main middleware for admin routes with auth
const adminMiddleware = withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const isAdmin = token?.role === "admin" || token?.role === "editor";
    const isLoginPage = req.nextUrl.pathname === "/admin/login";

    // Don't redirect if already on login page
    if (isLoginPage) {
      // Add header to help layout identify login page and admin routes
      const response = NextResponse.next();
      response.headers.set("x-pathname", req.nextUrl.pathname);
      response.headers.set("x-is-admin-route", "true");
      return response;
    }

    // Redirect to login if accessing admin routes without admin role
    if (req.nextUrl.pathname.startsWith("/admin") && !isAdmin) {
      return NextResponse.redirect(new URL("/admin/login", req.url));
    }

    const response = NextResponse.next();
    response.headers.set("x-pathname", req.nextUrl.pathname);
    response.headers.set("x-is-admin-route", "true");
    return response;
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        // Always allow access to login page (even with invalid/corrupted tokens)
        if (req.nextUrl.pathname === "/admin/login") {
          return true;
        }
        // For other admin routes, require a valid token
        // If token is invalid/corrupted, this will be false and middleware will redirect
        return !!token;
      },
    },
    // Handle JWT errors gracefully - don't throw, just treat as unauthorized
    pages: {
      signIn: "/admin/login",
    },
  }
);

// Export middleware that handles both admin routes and sets headers for all routes
export default function middleware(req: NextRequest) {
  // Set pathname header for all routes (so root layout can access it)
  const pathname = req.nextUrl.pathname;
  const isAdminRoute = pathname.startsWith("/admin");

  // If it's an admin route, use the auth middleware
  if (isAdminRoute) {
    return adminMiddleware(req, {} as any);
  }

  // For non-admin routes, just set the header
  const response = NextResponse.next();
  response.headers.set("x-pathname", pathname);
  response.headers.set("x-is-admin-route", "false");
  return response;
}

export const config = {
  // Match all routes to set headers, but auth only applies to admin routes
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};
