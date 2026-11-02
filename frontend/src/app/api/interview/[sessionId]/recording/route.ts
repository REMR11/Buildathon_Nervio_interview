import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getRecordingInfo } from "@/lib/interview/recordings";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ sessionId: string }>;
}

export async function GET(_request: Request, { params }: RouteContext) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { sessionId } = await params;
    const owned = await prisma.interviewSession.findFirst({
      where: { id: sessionId, userId: session.user.id },
      select: { id: true },
    });
    if (!owned) {
      return NextResponse.json(
        { error: "Sesión no encontrada" },
        { status: 404 },
      );
    }

    const info = await getRecordingInfo(sessionId);
    return NextResponse.json(info, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    console.error("GET /api/interview/[sessionId]/recording error:", error);
    return NextResponse.json(
      { error: "No se pudo cargar la grabación" },
      { status: 500 },
    );
  }
}
