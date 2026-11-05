import { headers } from "next/headers";
import { after, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import {
  fetchElevenLabsConversation,
  persistConversationArtifacts,
  rememberElevenLabsConversation,
  saveEvaluation,
} from "@/lib/interview/elevenlabs-analysis";
import { archiveConversationAudio } from "@/lib/interview/recordings";
import { prisma } from "@/lib/prisma";

interface RouteContext {
  params: Promise<{ sessionId: string }>;
}

const endSchema = z.object({
  conversationId: z.string().min(1).optional().nullable(),
  reason: z
    .enum(["manual", "agent", "poor_connection", "time_limit"])
    .optional(),
  skipEvaluation: z.boolean().optional(),
});

export async function POST(request: Request, { params }: RouteContext) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { sessionId } = await params;
    const parsed = endSchema.safeParse(await request.json().catch(() => ({})));
    const payload = parsed.success ? parsed.data : {};
    const conversationId = payload.conversationId ?? null;
    const interview = await prisma.interviewSession.findFirst({
      where: { id: sessionId, userId: session.user.id },
      select: { id: true, status: true, evaluations: { select: { id: true } } },
    });

    if (!interview) {
      return NextResponse.json(
        { error: "Sesión no encontrada" },
        { status: 404 },
      );
    }

    if (interview.status === "ended") {
      return NextResponse.json(
        {
          error:
            "La entrevista ya fue completada y no puede volver a finalizarse",
          status: "ended",
          reportReady: Boolean(interview.evaluations),
        },
        { status: 409 },
      );
    }

    await prisma.interviewSession.update({
      where: { id: sessionId },
      data: {
        status: "ended",
        endedAt: new Date(),
      },
    });

    if (conversationId) {
      await rememberElevenLabsConversation(sessionId, conversationId);
      // El audio puede tardar en generarse: se copia a Storage después de responder.
      after(() =>
        archiveConversationAudio(sessionId, conversationId).catch((error) =>
          console.error("Recording archive error:", error),
        ),
      );
    }

    const { evaluation, conversation } =
      conversationId && !payload.skipEvaluation
        ? await fetchElevenLabsConversation(conversationId)
        : { evaluation: null, conversation: null };

    if (evaluation) {
      await saveEvaluation(sessionId, evaluation);
    }

    if (conversation) {
      await persistConversationArtifacts(sessionId, conversation).catch(
        (error) => console.error("Transcript sync error:", error),
      );
    }

    return NextResponse.json({
      sessionId,
      status: "ended",
      reportReady: Boolean(evaluation),
    });
  } catch (error) {
    console.error("POST /api/interview/[sessionId]/end error:", error);
    return NextResponse.json(
      { error: "No se pudo finalizar la entrevista" },
      { status: 500 },
    );
  }
}
