import { describe, expect, it } from "vitest";
import {
  buildElevenLabsEvaluation,
  buildLocalEvaluation,
  normalizeResultList,
  parseStoredList,
  toInterviewReport,
} from "@/lib/interview/reporting";

describe("normalizeResultList", () => {
  it("acepta arreglos y JSON en texto", () => {
    expect(normalizeResultList([" Clara ", ""])).toEqual(["Clara"]);
    expect(normalizeResultList('["A","B"]')).toEqual(["A", "B"]);
  });

  it("parte viñetas y comas", () => {
    expect(normalizeResultList("- Uno\n- Dos")).toEqual(["Uno", "Dos"]);
    expect(normalizeResultList("claridad, estructura")).toEqual([
      "claridad",
      "estructura",
    ]);
  });

  it("devuelve vacío ante tipos no soportados", () => {
    expect(normalizeResultList(3)).toEqual([]);
    expect(normalizeResultList("")).toEqual([]);
  });
});

describe("parseStoredList", () => {
  it("parsea JSON o líneas", () => {
    expect(parseStoredList('["a","b"]')).toEqual(["a", "b"]);
    expect(parseStoredList("a\nb")).toEqual(["a", "b"]);
    expect(parseStoredList(null)).toEqual([]);
  });
});

describe("buildLocalEvaluation", () => {
  it("sube el puntaje con respuestas largas y varias", () => {
    const short = buildLocalEvaluation(["ok"]);
    const long = buildLocalEvaluation([
      "Describí un proyecto con métricas, usuarios impactados y el trade-off técnico.",
      "Expliqué concurrencia versus paralelismo con un ejemplo de cola y workers.",
    ]);
    expect(long.scoreGlobal).toBeGreaterThan(short.scoreGlobal);
    expect(long.recommendation).toMatch(/practicando|simulación/i);
  });
});

describe("buildElevenLabsEvaluation", () => {
  it("devuelve null si no hay analysis", () => {
    expect(buildElevenLabsEvaluation({})).toBeNull();
  });

  it("mapea scores y listas del agente", () => {
    const evaluation = buildElevenLabsEvaluation({
      analysis: {
        data_collection_results: {
          scoreClarity: { value: 80 },
          scoreKnowledge: { value: 70 },
          scoreConfidence: { value: 60 },
          scoreStructure: { value: 90 },
          scoreGlobal: { value: 75, rationale: "Sólido." },
          strengths: { value: ["Comunicación clara"] },
          weaknesses: { value: "Profundizar en sistema; Medir impacto" },
        },
      },
    });
    expect(evaluation).not.toBeNull();
    expect(evaluation?.scoreGlobal).toBe(75);
    expect(evaluation?.strengths).toEqual(["Comunicación clara"]);
    expect(evaluation?.weaknesses.length).toBeGreaterThan(0);
  });
});

describe("toInterviewReport", () => {
  it("lanza si no hay evaluación", () => {
    expect(() =>
      toInterviewReport({
        id: "s1",
        interviewType: "hr",
        role: "QA",
        evaluations: null,
      }),
    ).toThrow(/Reporte no generado/);
  });

  it("arma el reporte desde filas persistidas", () => {
    const report = toInterviewReport({
      id: "s1",
      interviewType: "tecnico",
      role: "Frontend",
      user: { name: "Candidato Prueba" },
      evaluations: {
        scoreGlobal: 82,
        scoreClarity: 80,
        scoreKnowledge: 84,
        scoreConfidence: 79,
        scoreStructure: 85,
        strengths: '["Comunicación"]',
        weaknesses: "Profundizar\nEjemplos",
        recommendation: "Sigue así.",
      },
      questions: [
        {
          questionText: "Cuéntame un proyecto.",
          responses: [
            {
              responseText: "Lideré un panel en Next.js con Server Components.",
              feedback: "Buena estructura.",
              score: 80,
              suggestion: "Añade métricas.",
            },
          ],
        },
      ],
    });
    expect(report.sessionId).toBe("s1");
    expect(report.candidateName).toBe("Candidato Prueba");
    expect(report.strengths).toEqual(["Comunicación"]);
    expect(report.transcriptSource).toBe("local");
    expect(report.transcript[0]?.feedbackSource).toBe("elevenlabs");
  });
});
