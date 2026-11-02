import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export async function requireAuth(callbackPath?: string) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    const callback = callbackPath
      ? `?callbackUrl=${encodeURIComponent(callbackPath)}`
      : "";
    redirect(`/login${callback}`);
  }

  return session;
}

/** Página solo para administradores: login si no hay sesión, 404 si no es admin. */
export async function requireAdminPage(callbackPath = "/admin") {
  const session = await requireAuth(callbackPath);
  const user = session.user as typeof session.user & {
    role?: string | null;
    banned?: boolean | null;
  };
  const roles = (user.role ?? "user").split(",").map((r) => r.trim());
  if (user.banned || !roles.includes("admin")) notFound();
  return session;
}
