import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkTokenRateLimit } from "@/lib/rate-limit";

export async function GET(request: Request) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const sessionId = new URL(request.url).searchParams.get("sessionId");
    if (!sessionId) {
      return NextResponse.json(
        { error: "Se requiere el identificador de la entrevista" },
        { status: 400 },
      );
    }

    const interview = await prisma.interviewSession.findFirst({
      where: { id: sessionId, userId: session.user.id },
      select: { status: true },
    });
    if (!interview) {
      return NextResponse.json(
        { error: "Sesión no encontrada" },
        { status: 404 },
      );
    }
    if (interview.status === "ended") {
      return NextResponse.json(
        { error: "La entrevista ya fue completada y no puede reiniciarse" },
        { status: 409 },
      );
    }

    const limit = checkTokenRateLimit(session.user.id);
    if (!limit.ok) {
      return NextResponse.json(
        { error: limit.message },
        {
          status: 429,
          headers: { "Retry-After": String(limit.retryAfterSeconds) },
        },
      );
    }

    const apiKey = process.env.ELEVENLABS_API_KEY;
    const agentId = process.env.ELEVENLABS_AGENT_ID;

    if (!apiKey || !agentId) {
      return NextResponse.json(
        { error: "ELEVENLABS_API_KEY o ELEVENLABS_AGENT_ID no configuradas" },
        { status: 500 },
      );
    }

    const response = await fetch(
      `https://api.elevenlabs.io/v1/convai/conversation/token?agent_id=${encodeURIComponent(agentId)}`,
      {
        headers: { "xi-api-key": apiKey },
      },
    );

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      console.error("ElevenLabs token error:", response.status, detail);
      return NextResponse.json(
        { error: "No se pudo obtener el token de conversación" },
        { status: 502 },
      );
    }

    const body = (await response.json()) as { token: string };
    return NextResponse.json({ token: body.token });
  } catch (error) {
    console.error("GET /api/elevenlabs/token error:", error);
    return NextResponse.json(
      { error: "Error interno al obtener token" },
      { status: 500 },
    );
  }
}
