import { getSessionCookie } from "better-auth/cookies";
import { type NextRequest, NextResponse } from "next/server";

// Chequeo optimista (solo cookie). La validación real de la sesión
// se hace en cada página con requireAuth()/requireAdminPage() y en las
// rutas de la API con requireRole(). El rol se valida en el servidor.
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const hasSession = Boolean(getSessionCookie(request));

  if (
    (pathname.startsWith("/interview") || pathname.startsWith("/admin")) &&
    !hasSession
  ) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", `${pathname}${search}`);
    return NextResponse.redirect(loginUrl);
  }

  if ((pathname === "/login" || pathname === "/register") && hasSession) {
    return NextResponse.redirect(new URL("/interview/setup", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/interview/:path*",
    "/admin/:path*",
    "/admin",
    "/login",
    "/register",
  ],
};
