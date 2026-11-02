import { randomBytes } from "node:crypto";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const SHARE_TTL_DAYS = 30;

interface RouteContext {
  params: Promise<{ sessionId: string }>;
}

async function ownedSession(sessionId: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) return { error: 401 as const };
  const interview = await prisma.interviewSession.findFirst({
    where: { id: sessionId, userId: session.user.id },
    select: { id: true, evaluations: { select: { id: true } } },
  });
  if (!interview) return { error: 404 as const };
  return { userId: session.user.id, interview };
}

function shareUrl(request: Request, token: string) {
  const base =
    process.env.BETTER_AUTH_URL?.replace(/\/$/, "") ||
    new URL(request.url).origin;
  return `${base}/r/${token}`;
}

/** Crea (o reutiliza) un enlace público de solo lectura al reporte. */
export async function POST(request: Request, { params }: RouteContext) {
  const { sessionId } = await params;
  const owned = await ownedSession(sessionId);
  if ("error" in owned) {
    return NextResponse.json(
      { error: owned.error === 401 ? "No autorizado" : "Sesión no encontrada" },
      { status: owned.error },
    );
  }
  if (!owned.interview.evaluations) {
    return NextResponse.json(
      { error: "El reporte aún no está listo" },
      { status: 409 },
    );
  }

  const now = new Date();
  let share = await prisma.report_shares.findFirst({
    where: { sessionId, revokedAt: null, expiresAt: { gt: now } },
    orderBy: { createdAt: "desc" },
  });
  if (!share) {
    share = await prisma.report_shares.create({
      data: {
        sessionId,
        createdById: owned.userId,
        token: randomBytes(24).toString("base64url"),
        expiresAt: new Date(
          now.getTime() + SHARE_TTL_DAYS * 24 * 60 * 60 * 1000,
        ),
      },
    });
  }

  return NextResponse.json({
    url: shareUrl(request, share.token),
    token: share.token,
    expiresAt: share.expiresAt.toISOString(),
  });
}

/** Revoca todos los enlaces públicos vigentes de la sesión. */
export async function DELETE(_request: Request, { params }: RouteContext) {
  const { sessionId } = await params;
  const owned = await ownedSession(sessionId);
  if ("error" in owned) {
    return NextResponse.json(
      { error: owned.error === 401 ? "No autorizado" : "Sesión no encontrada" },
      { status: owned.error },
    );
  }
  const result = await prisma.report_shares.updateMany({
    where: { sessionId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  return NextResponse.json({ revoked: result.count });
}
