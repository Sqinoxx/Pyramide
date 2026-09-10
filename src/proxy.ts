import { NextResponse } from "next/server";
import { auth } from "@/auth";

// Next.js 16 renamed middleware.js -> proxy.js (same mechanism, new name);
// see node_modules/next/dist/docs/.../proxy.md. `auth(...)` from next-auth
// v5 wraps a normal proxy handler and injects `req.auth`.
export default auth((req) => {
  const { pathname } = req.nextUrl;
  const session = req.auth;

  const isAdminRoute = pathname.startsWith("/admin");
  const isMemberRoute =
    pathname.startsWith("/profil") ||
    pathname.startsWith("/forderungen") ||
    pathname.startsWith("/benachrichtigungen") ||
    pathname.startsWith("/mitglieder");

  if ((isAdminRoute || isMemberRoute) && !session) {
    const loginUrl = new URL("/login", req.nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isAdminRoute && session?.user.role !== "admin") {
    return NextResponse.redirect(new URL("/", req.nextUrl.origin));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/profil/:path*",
    "/forderungen/:path*",
    "/benachrichtigungen/:path*",
    "/mitglieder/:path*",
    "/admin/:path*",
  ],
};
