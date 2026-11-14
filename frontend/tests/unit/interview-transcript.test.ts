import { describe, expect, it } from "vitest";
import {
  buildTranscriptItems,
  feedbackForPosition,
  heuristicAnswerFeedback,
  normalizeElevenLabsTranscript,
  pairTranscript,
  parsePerAnswerFeedback,
} from "@/lib/interview/transcript";

describe("normalizeElevenLabsTranscript", () => {
  it("ignora entradas vacías y normaliza roles", () => {
    const turns = normalizeElevenLabsTranscript([
      { role: "agent", message: "Hola", time_in_call_secs: 1.2 },
      { role: "user", message: "  ", time_in_call_secs: 2 },
      { role: "user", message: "Bien", time_in_call_secs: "3" },
      { foo: 1 },
    ]);
    expect(turns).toEqual([
      { role: "agent", message: "Hola", timeInCallSecs: 1 },
      { role: "user", message: "Bien", timeInCallSecs: 3 },
    ]);
  });

  it("devuelve vacío si no es arreglo", () => {
    expect(normalizeElevenLabsTranscript(null)).toEqual([]);
  });
});

describe("pairTranscript", () => {
  it("agrupa pregunta del agente y respuesta del usuario", () => {
    const pairs = pairTranscript([
      { role: "agent", message: "Pregunta 1", timeInCallSecs: 1 },
      { role: "user", message: "Respuesta 1", timeInCallSecs: 5 },
      { role: "agent", message: "Pregunta 2", timeInCallSecs: 10 },
      { role: "user", message: "Respuesta 2", timeInCallSecs: 12 },
    ]);
    expect(pairs).toHaveLength(2);
    expect(pairs[0]?.question).toBe("Pregunta 1");
    expect(pairs[1]?.answer).toBe("Respuesta 2");
  });
});

describe("parsePerAnswerFeedback", () => {
  it("acepta JSON envuelto en fences", () => {
    const parsed = parsePerAnswerFeedback(
      '```json\n[{"indice":1,"feedback":"Clara","puntaje":8,"sugerencia":"Más datos"}]\n```',
    );
    expect(parsed[0]).toMatchObject({
      index: 1,
      feedback: "Clara",
      score: 80,
      suggestion: "Más datos",
    });
  });

  it("lee un objeto con items", () => {
    expect(
      parsePerAnswerFeedback({
        items: [{ feedback: "Ok", index: 2, score: 70 }],
      })[0]?.index,
    ).toBe(2);
  });
});

describe("feedbackForPosition", () => {
  it("busca por índice o por orden si no hay índices", () => {
    const withIndex = [
      { index: 2, feedback: "B", score: 1, suggestion: null },
      { index: 1, feedback: "A", score: 1, suggestion: null },
    ];
    expect(feedbackForPosition(withIndex, 1)?.feedback).toBe("A");
    const noIndex = [
      { index: null, feedback: "uno", score: 1, suggestion: null },
      { index: null, feedback: "dos", score: 1, suggestion: null },
    ];
    expect(feedbackForPosition(noIndex, 2)?.feedback).toBe("dos");
  });
});

describe("heuristicAnswerFeedback", () => {
  it("penaliza respuestas cortas y muletillas", () => {
    const short = heuristicAnswerFeedback("eh bueno este pues ok");
    const rich = heuristicAnswerFeedback(
      "En mi anterior rol logré bajar el tiempo de build un 30% por ejemplo al cachear dependencias.",
    );
    expect(rich.score).toBeGreaterThan(short.score);
    expect(short.suggestion).toMatch(/STAR/i);
  });
});

describe("buildTranscriptItems", () => {
  it("usa feedback de ElevenLabs cuando existe y si no la heurística", () => {
    const items = buildTranscriptItems(
      [
        {
          question: "Q1",
          answer: "A1 breve",
          questionAtSecs: 1,
          answerAtSecs: 2,
        },
        {
          question: "Q2",
          answer:
            "En mi anterior equipo logré un resultado medible por ejemplo en 3 sprints.",
          questionAtSecs: 3,
          answerAtSecs: 4,
        },
      ],
      [{ feedback: "Del agente", score: 88, suggestion: "Sigue" }, undefined],
    );
    expect(items[0]?.feedbackSource).toBe("elevenlabs");
    expect(items[1]?.feedbackSource).toBe("heuristic");
  });
});
