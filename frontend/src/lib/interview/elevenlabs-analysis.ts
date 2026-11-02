import {
  buildElevenLabsEvaluation,
  type ElevenLabsConversationAnalysis,
  type LocalEvaluation,
} from "@/lib/interview/reporting";
import {
  feedbackForPosition,
  normalizeElevenLabsTranscript,
  PER_ANSWER_FEEDBACK_FIELD,
  pairTranscript,
  parsePerAnswerFeedback,
} from "@/lib/interview/transcript";
import { prisma } from "@/lib/prisma";

const FLOW_NAME = "elevenlabs-conversation";

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function rememberElevenLabsConversation(
  sessionId: string,
  conversationId: string,
) {
  const existing = await prisma.webhook_logs.findFirst({
    where: {
      sessionId,
      flowName: FLOW_NAME,
      status: "conversation_id",
    },
    select: { id: true },
  });

  await prisma.interviewSession.update({
    where: { id: sessionId },
    data: { elevenlabsConversationId: conversationId },
  });

  const payload = { conversationId };

  if (existing) {
    await prisma.webhook_logs.update({
      where: { id: existing.id },
      data: { requestPayload: payload },
    });
    return;
  }

  await prisma.webhook_logs.create({
    data: {
      sessionId,
      flowName: FLOW_NAME,
      endpoint: "elevenlabs-conversation-id",
      requestPayload: payload,
      status: "conversation_id",
    },
  });
}

export async function getRememberedElevenLabsConversationId(sessionId: string) {
  const session = await prisma.interviewSession.findUnique({
    where: { id: sessionId },
    select: { elevenlabsConversationId: true },
  });
  if (session?.elevenlabsConversationId) {
    return session.elevenlabsConversationId;
  }

  const log = await prisma.webhook_logs.findFirst({
    where: {
      sessionId,
      flowName: FLOW_NAME,
      status: "conversation_id",
    },
    orderBy: { createdAt: "desc" },
    select: { requestPayload: true },
  });

  const payload = log?.requestPayload;
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return null;
  }

  const conversationId = (payload as Record<string, unknown>).conversationId;
  return typeof conversationId === "string" ? conversationId : null;
}

export type ElevenLabsConversation = ElevenLabsConversationAnalysis & {
  status?: string;
  transcript?: unknown;
};

export interface ElevenLabsConversationResult {
  evaluation: LocalEvaluation | null;
  conversation: ElevenLabsConversation | null;
}

export async function fetchElevenLabsEvaluation(
  conversationId: string,
  attempts = 8,
): Promise<LocalEvaluation | null> {
  return (await fetchElevenLabsConversation(conversationId, attempts))
    .evaluation;
}

/**
 * Consulta GET /v1/convai/conversations/{id} hasta que el análisis esté listo
 * (o se agoten los intentos). Devuelve la última conversación obtenida.
 */
export async function fetchElevenLabsConversation(
  conversationId: string,
  attempts = 8,
): Promise<ElevenLabsConversationResult> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  let last: ElevenLabsConversation | null = null;
  if (!apiKey) return { evaluation: null, conversation: null };

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    if (attempt > 0) await delay(1500);

    const response = await fetch(
      `https://api.elevenlabs.io/v1/convai/conversations/${encodeURIComponent(
        conversationId,
      )}`,
      {
        headers: { "xi-api-key": apiKey },
        cache: "no-store",
      },
    );

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      console.error("ElevenLabs conversation error:", response.status, detail);
      return { evaluation: null, conversation: last };
    }

    const conversation = (await response.json()) as ElevenLabsConversation;
    last = conversation;
    const evaluation = buildElevenLabsEvaluation(conversation);
    if (evaluation) return { evaluation, conversation };
    if (conversation.status === "done" || conversation.status === "failed") {
      return { evaluation: null, conversation };
    }
  }

  return { evaluation: null, conversation: last };
}

/**
 * Guarda la transcripción oficial y el feedback por respuesta de ElevenLabs.
 * Idempotente: reemplaza los turnos y las respuestas derivadas de la sesión.
 * Devuelve false si la conversación no trae transcripción utilizable.
 */
export async function persistConversationArtifacts(
  sessionId: string,
  conversation: ElevenLabsConversation,
): Promise<boolean> {
  const turns = normalizeElevenLabsTranscript(conversation.transcript);
  if (turns.length === 0) return false;

  const pairs = pairTranscript(turns);
  const feedbackList = parsePerAnswerFeedback(
    conversation.analysis?.data_collection_results?.[PER_ANSWER_FEEDBACK_FIELD]
      ?.value,
  );

  // Vincula cada par con una pregunta existente (mismo texto) o crea una nueva.
  const existing = await prisma.questions.findMany({
    where: { sessionId },
    select: { id: true, questionText: true, orderIndex: true },
    orderBy: { orderIndex: "asc" },
  });
  const byText = new Map(
    existing.map((q) => [q.questionText.trim().toLowerCase(), q.id]),
  );
  let nextOrder = existing.reduce((max, q) => Math.max(max, q.orderIndex), 0);
  const questionIds: string[] = [];
  for (const pair of pairs) {
    const key = pair.question.trim().toLowerCase();
    let id = byText.get(key);
    if (!id) {
      nextOrder += 1;
      const created = await prisma.questions.create({
        data: {
          sessionId,
          questionText: pair.question,
          orderIndex: nextOrder,
          isFollowup: existing.length > 0,
        },
        select: { id: true },
      });
      id = created.id;
      byText.set(key, id);
    }
    questionIds.push(id);
  }

  const startedAt = Date.now();
  await prisma.$transaction([
    prisma.transcript_turns.deleteMany({ where: { sessionId } }),
    prisma.transcript_turns.createMany({
      data: turns.map((turn, index) => ({
        sessionId,
        orderIndex: index,
        role: turn.role,
        message: turn.message,
        timeInCallSecs: turn.timeInCallSecs,
      })),
    }),
    // Las respuestas se re-derivan de la transcripción oficial (más completa que
    // los fragmentos capturados en vivo) para poder adjuntar el feedback de cada una.
    prisma.responses.deleteMany({ where: { sessionId } }),
    prisma.responses.createMany({
      data: pairs.map((pair, index) => {
        const fb = feedbackForPosition(feedbackList, index + 1);
        return {
          sessionId,
          questionId: questionIds[index],
          responseText: pair.answer,
          feedback: fb?.feedback ?? null,
          score: fb?.score ?? null,
          suggestion: fb?.suggestion ?? null,
          // Conserva el orden cronológico para alinear respuestas con los pares.
          createdAt: new Date(startedAt + index),
        };
      }),
    }),
  ]);

  return true;
}

/** Sincroniza la transcripción si la sesión tiene conversationId y aún no tiene turnos. */
export async function syncTranscriptIfMissing(sessionId: string) {
  const count = await prisma.transcript_turns.count({ where: { sessionId } });
  if (count > 0) return false;
  const conversationId = await getRememberedElevenLabsConversationId(sessionId);
  if (!conversationId) return false;
  const { conversation, evaluation } = await fetchElevenLabsConversation(
    conversationId,
    1,
  );
  if (evaluation) {
    const hasEvaluation = await prisma.evaluations.count({
      where: { sessionId },
    });
    if (!hasEvaluation) await saveEvaluation(sessionId, evaluation);
  }
  return conversation
    ? persistConversationArtifacts(sessionId, conversation)
    : false;
}

export async function saveEvaluation(
  sessionId: string,
  evaluation: LocalEvaluation,
) {
  await prisma.evaluations.upsert({
    where: { sessionId },
    create: {
      sessionId,
      scoreGlobal: evaluation.scoreGlobal,
      scoreClarity: evaluation.scoreClarity,
      scoreKnowledge: evaluation.scoreKnowledge,
      scoreConfidence: evaluation.scoreConfidence,
      scoreStructure: evaluation.scoreStructure,
      strengths: JSON.stringify(evaluation.strengths),
      weaknesses: JSON.stringify(evaluation.weaknesses),
      recommendation: evaluation.recommendation,
    },
    update: {
      scoreGlobal: evaluation.scoreGlobal,
      scoreClarity: evaluation.scoreClarity,
      scoreKnowledge: evaluation.scoreKnowledge,
      scoreConfidence: evaluation.scoreConfidence,
      scoreStructure: evaluation.scoreStructure,
      strengths: JSON.stringify(evaluation.strengths),
      weaknesses: JSON.stringify(evaluation.weaknesses),
      recommendation: evaluation.recommendation,
    },
  });
}
