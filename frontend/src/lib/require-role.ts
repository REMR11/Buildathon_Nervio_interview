import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export type AppRole = "user" | "admin";

type Session = NonNullable<Awaited<ReturnType<typeof auth.api.getSession>>>;

export type RoleCheck =
  | { ok: true; session: Session }
  | { ok: false; response: NextResponse };

function hasRole(userRole: string | null | undefined, allowed: AppRole[]) {
  // Better Auth guarda varios roles separados por coma ("user,admin").
  const roles = (userRole ?? "user").split(",").map((r) => r.trim());
  // admin hereda todos los permisos.
  if (roles.includes("admin")) return true;
  return allowed.some((role) => roles.includes(role));
}

/**
 * Valida sesión y rol en rutas de la API.
 * 401 si no hay sesión, 403 si el rol no está permitido o la cuenta está baneada.
 */
export async function requireRole(...allowed: AppRole[]): Promise<RoleCheck> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) {
    return {
      ok: false,
      response: NextResponse.json({ error: "No autorizado" }, { status: 401 }),
    };
  }
  const user = session.user as typeof session.user & {
    role?: string | null;
    banned?: boolean | null;
  };
  if (user.banned || !hasRole(user.role, allowed.length ? allowed : ["user"])) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Prohibido: permisos insuficientes" },
        { status: 403 },
      ),
    };
  }
  return { ok: true, session };
}

export function isAdmin(role: string | null | undefined) {
  return hasRole(role, ["admin"]);
}
