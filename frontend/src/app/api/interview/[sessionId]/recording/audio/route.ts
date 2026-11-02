import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  RECORDING_RETENTION_DAYS,
  recordingExpiry,
} from "@/lib/interview/recordings";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ sessionId: string }>;
}

/** Proxy autenticado al audio de ElevenLabs mientras no exista la copia en Storage. */
export async function GET(request: Request, { params }: RouteContext) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { sessionId } = await params;
  const interview = await prisma.interviewSession.findFirst({
    where: { id: sessionId, userId: session.user.id },
    select: {
      elevenlabsConversationId: true,
      startedAt: true,
      createdAt: true,
    },
  });
  if (!interview?.elevenlabsConversationId) {
    return NextResponse.json(
      { error: "Grabación no encontrada" },
      { status: 404 },
    );
  }
  if (
    recordingExpiry(interview.startedAt ?? interview.createdAt).getTime() <=
    Date.now()
  ) {
    return NextResponse.json(
      { error: `Grabación expirada (${RECORDING_RETENTION_DAYS} días)` },
      { status: 410 },
    );
  }

  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Audio no disponible" }, { status: 503 });
  }

  const upstreamHeaders: Record<string, string> = { "xi-api-key": apiKey };
  const range = request.headers.get("range");
  if (range) upstreamHeaders.Range = range;

  const upstream = await fetch(
    `https://api.elevenlabs.io/v1/convai/conversations/${encodeURIComponent(
      interview.elevenlabsConversationId,
    )}/audio`,
    { headers: upstreamHeaders, cache: "no-store" },
  );
  if (!upstream.ok || !upstream.body) {
    return NextResponse.json(
      { error: "Audio no disponible todavía" },
      { status: upstream.status === 404 ? 404 : 502 },
    );
  }

  const responseHeaders = new Headers({
    "Content-Type": upstream.headers.get("content-type") ?? "audio/mpeg",
    "Cache-Control": "private, no-store",
  });
  for (const name of ["content-length", "content-range", "accept-ranges"]) {
    const value = upstream.headers.get(name);
    if (value) responseHeaders.set(name, value);
  }
  return new Response(upstream.body, {
    status: upstream.status,
    headers: responseHeaders,
  });
}
