import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/require-role";
import { updateProfileSchema } from "@/lib/validations/user";

const PROFILE_SELECT = {
  id: true,
  name: true,
  email: true,
  image: true,
  role: true,
  emailVerified: true,
  createdAt: true,
  updatedAt: true,
} as const;

export async function GET() {
  const check = await requireRole("user");
  if (!check.ok) return check.response;
  try {
    const user = await prisma.user.findUnique({
      where: { id: check.session.user.id },
      select: {
        ...PROFILE_SELECT,
        _count: { select: { interviewSessions: true, schedules: true } },
      },
    });
    if (!user) {
      return NextResponse.json(
        { error: "Usuario no encontrado" },
        { status: 404 },
      );
    }
    const { _count, ...profile } = user;
    return NextResponse.json({
      user: {
        ...profile,
        stats: {
          interviews: _count.interviewSessions,
          schedules: _count.schedules,
        },
      },
    });
  } catch (error) {
    console.error("[users/me] GET", error);
    return NextResponse.json(
      { error: "No se pudo obtener el perfil" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  const check = await requireRole("user");
  if (!check.ok) return check.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }
  const parsed = updateProfileSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: parsed.error.issues[0]?.message ?? "Datos inválidos",
        issues: parsed.error.issues.map((i) => ({
          path: i.path.join("."),
          message: i.message,
        })),
      },
      { status: 400 },
    );
  }
  try {
    const { name, image } = parsed.data;
    const user = await prisma.user.update({
      where: { id: check.session.user.id },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(image !== undefined ? { image: image || null } : {}),
      },
      select: PROFILE_SELECT,
    });
    return NextResponse.json({ user });
  } catch (error) {
    console.error("[users/me] PATCH", error);
    return NextResponse.json(
      { error: "No se pudo actualizar el perfil" },
      { status: 500 },
    );
  }
}
