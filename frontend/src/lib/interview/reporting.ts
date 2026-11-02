import {
  buildTranscriptItems,
  type NormalizedTurn,
  pairTranscript,
  type StoredFeedback,
  type TranscriptPair,
} from "./transcript";
import type { InterviewReport, InterviewType, TranscriptItem } from "./types";

interface StoredResponse {
  responseText: string | null;
  feedback?: string | null;
  score?: number | null;
  suggestion?: string | null;
}

interface ReportSource {
  id: string;
  interviewType: string;
  role: string;
  user?: { name: string } | null;
  transcriptTurns?: {
    role: string;
    message: string;
    timeInCallSecs: number | null;
  }[];
  questions?: {
    questionText: string;
    responses?: StoredResponse[];
  }[];
  evaluations?: {
    scoreGlobal: unknown;
    scoreClarity: unknown;
    scoreKnowledge: unknown;
    scoreConfidence: unknown;
    scoreStructure: unknown;
    strengths: string | null;
    weaknesses: string | null;
    recommendation: string | null;
  } | null;
}

export interface LocalEvaluation {
  scoreGlobal: number;
  scoreClarity: number;
  scoreKnowledge: number;
  scoreConfidence: number;
  scoreStructure: number;
  strengths: string[];
  weaknesses: string[];
  recommendation: string;
}

interface ElevenLabsResult {
  value?: unknown;
  rationale?: string;
}

export interface ElevenLabsConversationAnalysis {
  analysis?: {
    data_collection_results?: Record<string, ElevenLabsResult>;
  };
}

function toNumber(value: unknown, fallback = 0) {
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number(value);
  if (value && typeof value === "object" && "toNumber" in value) {
    const decimal = value as { toNumber: () => number };
    return decimal.toNumber();
  }
  return fallback;
}

function resultNumber(
  results: Record<string, ElevenLabsResult>,
  key: string,
  fallback = 0,
) {
  return Math.round(toNumber(results[key]?.value, fallback));
}

/**
 * Normaliza una lista que el agente puede devolver como arreglo, JSON en texto
 * o texto libre separado por saltos de línea, viñetas, punto y coma o comas.
 */
export function normalizeResultList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .filter((item): item is string => typeof item === "string")
      .map((item) => item.trim())
      .filter(Boolean);
  }
  if (typeof value !== "string") return [];
  const text = value.trim();
  if (!text) return [];
  if (text.startsWith("[")) {
    try {
      const parsed = JSON.parse(text) as unknown;
      if (Array.isArray(parsed)) return normalizeResultList(parsed);
    } catch {
      // texto libre que empieza con "["
    }
  }
  const byLines = text
    .split(/\r?\n|\s*[•·▪●]\s*|\s+-\s+(?=[A-ZÁÉÍÓÚÑ])|;/)
    .map((item) => item.replace(/^\s*(?:[-*•·]|\d+[.)])\s*/, "").trim())
    .filter(Boolean);
  if (byLines.length > 1) return byLines;
  const byCommas = text
    .split(/,\s*/)
    .map((item) => item.trim())
    .filter(Boolean);
  return byCommas.length > 1
    ? byCommas
    : [text.replace(/^\s*(?:[-*•·]|\d+[.)])\s*/, "")];
}

function resultStringList(
  results: Record<string, ElevenLabsResult>,
  ...keys: string[]
) {
  for (const key of keys) {
    const list = normalizeResultList(results[key]?.value);
    if (list.length > 0) return list;
  }
  return [];
}

export function parseStoredList(value: string | null | undefined) {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value) as unknown;
    if (Array.isArray(parsed))
      return parsed.filter((item): item is string => typeof item === "string");
  } catch {
    return value
      .split("\n")
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
}

export function buildLocalEvaluation(responseTexts: string[]): LocalEvaluation {
  const totalWords = responseTexts
    .join(" ")
    .split(/\s+/)
    .filter(Boolean).length;
  const responseCount = responseTexts.length;
  const averageWords = responseCount > 0 ? totalWords / responseCount : 0;
  const scoreKnowledge = Math.min(
    95,
    Math.max(55, Math.round(averageWords * 4)),
  );
  const scoreStructure = Math.min(95, Math.max(50, 62 + responseCount * 6));
  const scoreClarity = Math.min(
    95,
    Math.max(55, 58 + Math.round(averageWords * 2)),
  );
  const scoreConfidence = Math.min(
    95,
    Math.max(50, responseCount > 1 ? 72 : 60),
  );
  const scoreGlobal = Math.round(
    (scoreClarity + scoreKnowledge + scoreConfidence + scoreStructure) / 4,
  );

  const strengths = [
    responseCount > 1
      ? "Completaste varias respuestas durante la simulación"
      : "Iniciaste la práctica y mantuviste la interacción",
    averageWords >= 12
      ? "Tus respuestas tienen suficiente contexto para evaluar"
      : "Puedes usar este reporte como punto de partida para practicar",
  ];

  const weaknesses = [
    averageWords < 18
      ? "Agrega más ejemplos concretos y resultados medibles"
      : "Refuerza estructura: situación, acción y resultado",
    "Profundiza en decisiones técnicas y trade-offs del rol",
  ];

  return {
    scoreGlobal,
    scoreClarity,
    scoreKnowledge,
    scoreConfidence,
    scoreStructure,
    strengths,
    weaknesses,
    recommendation:
      scoreGlobal >= 75
        ? "Buen desempeño general. Sigue practicando respuestas con ejemplos específicos."
        : "Conviene repetir la simulación enfocándote en respuestas más completas y estructuradas.",
  };
}

export function buildElevenLabsEvaluation(
  conversation: ElevenLabsConversationAnalysis,
): LocalEvaluation | null {
  const results = conversation.analysis?.data_collection_results;
  if (!results) return null;

  const scoreClarity = resultNumber(results, "scoreClarity");
  const scoreKnowledge = resultNumber(results, "scoreKnowledge");
  const scoreConfidence = resultNumber(results, "scoreConfidence");
  const scoreStructure = resultNumber(results, "scoreStructure", scoreClarity);
  const scoreGlobal =
    resultNumber(results, "scoreGlobal") ||
    Math.round(
      (scoreClarity + scoreKnowledge + scoreConfidence + scoreStructure) / 4,
    );
  const strengths = resultStringList(results, "strengths", "fortalezas");
  const weaknesses = resultStringList(results, "weaknesses", "areas_de_mejora");

  if (!scoreGlobal) return null;

  return {
    scoreGlobal,
    scoreClarity,
    scoreKnowledge,
    scoreConfidence,
    scoreStructure,
    strengths,
    weaknesses,
    recommendation:
      typeof results.recommendation?.value === "string"
        ? results.recommendation.value
        : (results.scoreGlobal?.rationale ??
          "Reporte generado desde el análisis post-llamada de ElevenLabs."),
  };
}

function buildReportTranscript(session: ReportSource): {
  transcript: TranscriptItem[];
  transcriptSource: InterviewReport["transcriptSource"];
} {
  const responses = (session.questions ?? []).flatMap((q) => q.responses ?? []);
  const turns = session.transcriptTurns ?? [];

  if (turns.length > 0) {
    const pairs = pairTranscript(
      turns.map(
        (turn): NormalizedTurn => ({
          role: turn.role === "user" ? "user" : "agent",
          message: turn.message,
          timeInCallSecs: turn.timeInCallSecs,
        }),
      ),
    );
    // Las respuestas se guardan en el mismo orden que los pares de la transcripción.
    const ordered = [...responses];
    const stored: (StoredFeedback | undefined)[] = pairs.map((pair, i) => {
      const match =
        ordered.find((r) => r.responseText?.trim() === pair.answer.trim()) ??
        ordered[i];
      return match
        ? {
            feedback: match.feedback ?? null,
            score: match.score ?? null,
            suggestion: match.suggestion ?? null,
          }
        : undefined;
    });
    return {
      transcript: buildTranscriptItems(pairs, stored),
      transcriptSource: "elevenlabs",
    };
  }

  const pairs: TranscriptPair[] = [];
  const stored: (StoredFeedback | undefined)[] = [];
  for (const question of session.questions ?? []) {
    const answers = (question.responses ?? []).filter((r) =>
      r.responseText?.trim(),
    );
    if (answers.length === 0) continue;
    pairs.push({
      question: question.questionText,
      answer: answers.map((r) => r.responseText?.trim()).join(" "),
      questionAtSecs: null,
      answerAtSecs: null,
    });
    const withFeedback = answers.find((r) => r.feedback);
    stored.push(
      withFeedback
        ? {
            feedback: withFeedback.feedback ?? null,
            score: withFeedback.score ?? null,
            suggestion: withFeedback.suggestion ?? null,
          }
        : undefined,
    );
  }

  return {
    transcript: buildTranscriptItems(pairs, stored),
    transcriptSource: pairs.length > 0 ? "local" : "none",
  };
}

export function toInterviewReport(session: ReportSource): InterviewReport {
  const evaluation = session.evaluations;

  if (!evaluation) {
    throw new Error("Reporte no generado para esta sesión");
  }

  return {
    sessionId: session.id,
    scoreGlobal: Math.round(toNumber(evaluation.scoreGlobal)),
    scoreClarity: Math.round(toNumber(evaluation.scoreClarity)),
    scoreKnowledge: Math.round(toNumber(evaluation.scoreKnowledge)),
    scoreConfidence: Math.round(toNumber(evaluation.scoreConfidence)),
    scoreStructure: Math.round(toNumber(evaluation.scoreStructure)),
    strengths: parseStoredList(evaluation.strengths),
    weaknesses: parseStoredList(evaluation.weaknesses),
    recommendation:
      evaluation.recommendation ?? "Sigue practicando para mejorar.",
    interviewType: session.interviewType as InterviewType,
    role: session.role,
    candidateName: session.user?.name ?? "Candidato",
    ...buildReportTranscript(session),
  };
}
