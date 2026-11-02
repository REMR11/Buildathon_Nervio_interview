import type { TranscriptItem } from "./types";

/** Nombre del campo de Data Collection configurado en el agente de ElevenLabs. */
export const PER_ANSWER_FEEDBACK_FIELD = "feedback_por_respuesta";

export type TranscriptRole = "agent" | "user";

export interface NormalizedTurn {
  role: TranscriptRole;
  message: string;
  timeInCallSecs: number | null;
}

export interface TranscriptPair {
  question: string;
  answer: string;
  questionAtSecs: number | null;
  answerAtSecs: number | null;
}

export interface PerAnswerFeedback {
  index: number | null;
  feedback: string;
  score: number | null;
  suggestion: string | null;
}

/** Normaliza el arreglo `transcript` de GET /v1/convai/conversations/{id}. */
export function normalizeElevenLabsTranscript(raw: unknown): NormalizedTurn[] {
  if (!Array.isArray(raw)) return [];
  const turns: NormalizedTurn[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const record = item as Record<string, unknown>;
    const role = record.role === "user" ? "user" : "agent";
    const message =
      typeof record.message === "string" ? record.message.trim() : "";
    if (!message) continue;
    const secs = Number(record.time_in_call_secs);
    turns.push({
      role,
      message,
      timeInCallSecs: Number.isFinite(secs) ? Math.round(secs) : null,
    });
  }
  return turns;
}

/** Agrupa turnos consecutivos: bloque del agente = pregunta, bloque del usuario = respuesta. */
export function pairTranscript(turns: NormalizedTurn[]): TranscriptPair[] {
  const pairs: TranscriptPair[] = [];
  let question: string[] = [];
  let questionAt: number | null = null;
  let answer: string[] = [];
  let answerAt: number | null = null;

  const flush = () => {
    if (answer.length > 0) {
      pairs.push({
        question: question.join(" ") || "(Intervención inicial)",
        answer: answer.join(" "),
        questionAtSecs: questionAt,
        answerAtSecs: answerAt,
      });
    }
    question = [];
    questionAt = null;
    answer = [];
    answerAt = null;
  };

  for (const turn of turns) {
    if (turn.role === "agent") {
      if (answer.length > 0) flush();
      if (question.length === 0) questionAt = turn.timeInCallSecs;
      question.push(turn.message);
    } else {
      if (answer.length === 0) answerAt = turn.timeInCallSecs;
      answer.push(turn.message);
    }
  }
  flush();
  return pairs;
}

function clampScore(value: unknown): number | null {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  const scaled = n > 0 && n <= 10 ? n * 10 : n;
  return Math.max(0, Math.min(100, Math.round(scaled)));
}

function pickString(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

/**
 * Parsea de forma tolerante el valor del campo `feedback_por_respuesta`.
 * Acepta un arreglo, un string JSON (incluso dentro de ```json ... ```) o un objeto con `items`.
 */
export function parsePerAnswerFeedback(value: unknown): PerAnswerFeedback[] {
  let data: unknown = value;

  if (typeof data === "string") {
    const text = data
      .trim()
      .replace(/^```(?:json)?/i, "")
      .replace(/```$/, "")
      .trim();
    const start = text.search(/[[{]/);
    if (start === -1) return [];
    try {
      data = JSON.parse(text.slice(start));
    } catch {
      return [];
    }
  }

  if (data && typeof data === "object" && !Array.isArray(data)) {
    const record = data as Record<string, unknown>;
    data = record.items ?? record.respuestas ?? record.feedback ?? [];
  }

  if (!Array.isArray(data)) return [];

  const result: PerAnswerFeedback[] = [];
  for (const item of data) {
    if (!item || typeof item !== "object") continue;
    const record = item as Record<string, unknown>;
    const feedback = pickString(record, ["feedback", "comentario", "comment"]);
    if (!feedback) continue;
    const index = Number(record.indice ?? record.index ?? record.numero);
    result.push({
      index: Number.isInteger(index) && index > 0 ? index : null,
      feedback,
      score: clampScore(record.puntaje ?? record.score ?? record.calificacion),
      suggestion: pickString(record, ["sugerencia", "suggestion", "mejora"]),
    });
  }
  return result;
}

/** Devuelve el feedback para la respuesta número `position` (base 1). */
export function feedbackForPosition(
  list: PerAnswerFeedback[],
  position: number,
): PerAnswerFeedback | null {
  return (
    list.find((item) => item.index === position) ??
    (list.every((item) => item.index === null)
      ? (list[position - 1] ?? null)
      : null)
  );
}

const FILLER_REGEX =
  /\b(eh+|em+|mm+|este|o sea|pues|bueno|básicamente|digamos|tipo)\b/gi;
const EXAMPLE_REGEX =
  /(por ejemplo|en mi (anterior|último|ultimo)|cuando |logr|result|impact|\d)/i;

/** Feedback heurístico local, usado cuando ElevenLabs no devuelve análisis por respuesta. */
export function heuristicAnswerFeedback(answer: string): {
  feedback: string;
  score: number;
  suggestion: string;
} {
  const words = answer.split(/\s+/).filter(Boolean).length;
  const fillers = answer.match(FILLER_REGEX)?.length ?? 0;
  const hasExample = EXAMPLE_REGEX.test(answer);
  const score = Math.max(
    30,
    Math.min(
      90,
      Math.round(40 + Math.min(words, 80) * 0.5 + (hasExample ? 10 : 0)) -
        fillers * 3,
    ),
  );

  const notes: string[] = [];
  if (words < 12) notes.push("La respuesta es muy breve.");
  else if (words > 150)
    notes.push("La respuesta es extensa; podría perder foco.");
  else notes.push("La extensión de la respuesta es adecuada.");
  notes.push(
    hasExample
      ? "Incluye ejemplos o datos concretos."
      : "No se detectan ejemplos concretos ni resultados.",
  );
  if (fillers >= 3)
    notes.push(`Se detectaron ${fillers} muletillas que restan seguridad.`);

  const suggestion =
    words < 12
      ? "Desarrolla la idea con el método STAR: situación, tarea, acción y resultado."
      : !hasExample
        ? "Añade un ejemplo real con un resultado medible (tiempo, %, usuarios)."
        : fillers >= 3
          ? "Haz pausas breves en lugar de usar muletillas."
          : "Cierra con el impacto o aprendizaje principal.";

  return { feedback: notes.join(" "), score, suggestion };
}

export interface StoredFeedback {
  feedback: string | null;
  score: number | null;
  suggestion: string | null;
}

export function buildTranscriptItems(
  pairs: TranscriptPair[],
  stored: (StoredFeedback | undefined)[],
): TranscriptItem[] {
  return pairs.map((pair, i) => {
    const fromAi = stored[i];
    if (fromAi?.feedback) {
      return {
        order: i + 1,
        ...pair,
        feedback: fromAi.feedback,
        score: fromAi.score,
        suggestion: fromAi.suggestion,
        feedbackSource: "elevenlabs" as const,
      };
    }
    const local = heuristicAnswerFeedback(pair.answer);
    return {
      order: i + 1,
      ...pair,
      ...local,
      feedbackSource: "heuristic" as const,
    };
  });
}
