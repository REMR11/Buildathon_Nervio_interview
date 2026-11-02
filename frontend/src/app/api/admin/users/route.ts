import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/require-role";

// Listado de usuarios para administradores (solo rol admin).
// Las acciones (cambiar rol, banear) usan los endpoints del plugin admin:
// POST /api/auth/admin/set-role, /api/auth/admin/ban-user, /api/auth/admin/unban-user
export async function GET() {
  const check = await requireRole("admin");
  if (!check.ok) return check.response;

  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        banned: true,
        banReason: true,
        createdAt: true,
        _count: { select: { interviewSessions: true } },
      },
    });
    return NextResponse.json({
      users: users.map(({ _count, ...u }) => ({
        ...u,
        interviews: _count.interviewSessions,
      })),
    });
  } catch (error) {
    console.error("[admin/users] GET", error);
    return NextResponse.json(
      { error: "No se pudo obtener la lista de usuarios" },
      { status: 500 },
    );
  }
}
