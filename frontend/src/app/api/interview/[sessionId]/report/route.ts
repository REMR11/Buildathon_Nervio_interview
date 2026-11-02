import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  fetchElevenLabsEvaluation,
  getRememberedElevenLabsConversationId,
  saveEvaluation,
  syncTranscriptIfMissing,
} from "@/lib/interview/elevenlabs-analysis";
import { toInterviewReport } from "@/lib/interview/reporting";
import { prisma } from "@/lib/prisma";

const REPORT_INCLUDE = {
  evaluations: true,
  user: true,
  transcriptTurns: { orderBy: { orderIndex: "asc" as const } },
  questions: {
    orderBy: { orderIndex: "asc" as const },
    include: { responses: { orderBy: { createdAt: "asc" as const } } },
  },
};

interface RouteContext {
  params: Promise<{ sessionId: string }>;
}

export async function GET(_request: Request, { params }: RouteContext) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { sessionId } = await params;
    let interview = await prisma.interviewSession.findFirst({
      where: { id: sessionId, userId: session.user.id },
      include: REPORT_INCLUDE,
    });

    if (!interview) {
      return NextResponse.json(
        { error: "Sesión no encontrada" },
        { status: 404 },
      );
    }

    if (!interview.evaluations) {
      const conversationId =
        await getRememberedElevenLabsConversationId(sessionId);
      const evaluation = conversationId
        ? await fetchElevenLabsEvaluation(conversationId, 5)
        : null;

      if (evaluation) {
        await saveEvaluation(sessionId, evaluation);
        interview = await prisma.interviewSession.findFirst({
          where: { id: sessionId, userId: session.user.id },
          include: REPORT_INCLUDE,
        });
      }
    }

    if (interview?.evaluations && interview.transcriptTurns.length === 0) {
      const synced = await syncTranscriptIfMissing(sessionId).catch((error) => {
        console.error("Transcript sync error:", error);
        return false;
      });
      if (synced) {
        interview = await prisma.interviewSession.findFirst({
          where: { id: sessionId, userId: session.user.id },
          include: REPORT_INCLUDE,
        });
      }
    }

    if (!interview?.evaluations) {
      return NextResponse.json(
        { error: "Reporte no generado para esta sesión" },
        { status: 404 },
      );
    }

    return NextResponse.json(toInterviewReport(interview));
  } catch (error) {
    console.error("GET /api/interview/[sessionId]/report error:", error);
    return NextResponse.json(
      { error: "No se pudo cargar el reporte" },
      { status: 500 },
    );
  }
}
