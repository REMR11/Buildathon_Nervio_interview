import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  fetchElevenLabsEvaluation,
  saveEvaluation,
} from "@/lib/interview/elevenlabs-analysis";
import { prisma } from "@/lib/prisma";
import { sseResponse } from "@/lib/realtime/sse";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

interface RouteContext {
  params: Promise<{ sessionId: string }>;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** Cada cuánto se reintenta el análisis post-llamada de ElevenLabs. */
const ELEVENLABS_RETRY_MS = 10_000;

/**
 * GET /api/realtime/interview/[sessionId] — SSE que emite `report.ready` en
 * cuanto la evaluación de la entrevista existe (y cierra el stream). Mientras
 * tanto reintenta el análisis de ElevenLabs del lado del servidor. Solo el
 * dueño de la sesión puede suscribirse.
 */
export async function GET(request: Request, { params }: RouteContext) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const { sessionId } = await params;
  const interview = UUID.test(sessionId)
    ? await prisma.interviewSession.findFirst({
        where: { id: sessionId, userId: session.user.id },
        select: { id: true },
      })
    : null;
  if (!interview) {
    return NextResponse.json(
      { error: "Sesión no encontrada" },
      { status: 404 },
    );
  }

  let lastElevenLabsTry = 0;
  let lastStatus: string | null = null;

  return sseResponse({
    signal: request.signal,
    intervalMs: 3000,
    tick: async () => {
      const current = await prisma.interviewSession.findUnique({
        where: { id: sessionId },
        select: {
          status: true,
          elevenlabsConversationId: true,
          evaluations: { select: { scoreGlobal: true } },
        },
      });
      if (current?.evaluations) {
        return {
          events: [
            {
              event: "report.ready",
              data: {
                sessionId,
                scoreGlobal:
                  current.evaluations.scoreGlobal === null
                    ? null
                    : Number(current.evaluations.scoreGlobal),
                url: `/interview/${sessionId}/report`,
              },
            },
          ],
          done: true,
        };
      }
      const conversationId = current?.elevenlabsConversationId;
      if (
        conversationId &&
        current?.status === "ended" &&
        Date.now() - lastElevenLabsTry >= ELEVENLABS_RETRY_MS
      ) {
        lastElevenLabsTry = Date.now();
        const evaluation = await fetchElevenLabsEvaluation(
          conversationId,
          1,
        ).catch(() => null);
        if (evaluation) await saveEvaluation(sessionId, evaluation);
      }
      const status = current?.status ?? "unknown";
      if (status === lastStatus) return {};
      lastStatus = status;
      return {
        events: [{ event: "report.pending", data: { sessionId, status } }],
      };
    },
  });
}
