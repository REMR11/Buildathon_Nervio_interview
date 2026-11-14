import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildExtraContext,
  callN8nGenerateInterview,
  toN8nGenerateInterviewPayload,
} from "@/lib/interview/n8n";
import type { InterviewSetupInput } from "@/lib/interview/types";
import { FICTIONAL_CV_TEXT } from "../fixtures/cv";

const setup: InterviewSetupInput = {
  role: "Backend Engineer",
  candidateName: "Candidato Prueba",
  level: "senior",
  language: "es",
  interviewType: "agresivo",
  extraContext: "Perfil ficticio de prueba para el payload de N8N.",
  stack: "  Node.js  ",
  cvText: FICTIONAL_CV_TEXT,
};

describe("buildExtraContext", () => {
  it("incluye candidato, contexto y CV", () => {
    const text = buildExtraContext(setup);
    expect(text).toContain("Candidato: Candidato Prueba");
    expect(text).toContain("Perfil ficticio");
    expect(text).toContain("CV del candidato:");
    expect(text).toContain("CV de prueba");
  });

  it("omite el bloque de CV si no hay texto", () => {
    const text = buildExtraContext({ ...setup, cvText: "  " });
    expect(text).not.toContain("CV del candidato");
  });
});

describe("toN8nGenerateInterviewPayload", () => {
  it("mapea campos y activa stress_mode en entrevistas agresivas", () => {
    const payload = toN8nGenerateInterviewPayload(setup, "user-1");
    expect(payload.user_id).toBe("user-1");
    expect(payload.stack).toBe("Node.js");
    expect(payload.stress_mode).toBe(true);
    expect(payload.interview_type).toBe("agresivo");
  });

  it("deja stress_mode en false para HR", () => {
    const payload = toN8nGenerateInterviewPayload(
      { ...setup, interviewType: "hr" },
      "user-1",
    );
    expect(payload.stress_mode).toBe(false);
  });
});

describe("callN8nGenerateInterview", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("falla si no hay webhook configurado", async () => {
    vi.stubEnv("N8N_WEBHOOK_GENERATE_INTERVIEW_URL", "");
    await expect(
      callN8nGenerateInterview(toN8nGenerateInterviewPayload(setup, "u1")),
    ).rejects.toThrow(/no configurada/);
  });

  it("parsea una respuesta válida", async () => {
    vi.stubEnv("N8N_WEBHOOK_GENERATE_INTERVIEW_URL", "https://n8n.test/hook");
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              sessionId: "11111111-1111-4111-8111-111111111111",
              questions: [
                {
                  session_id: "11111111-1111-4111-8111-111111111111",
                  question_text: "Pregunta 1",
                  order_index: 1,
                  is_followup: false,
                },
              ],
            }),
            { status: 200 },
          ),
      ),
    );
    const result = await callN8nGenerateInterview(
      toN8nGenerateInterviewPayload(setup, "u1"),
    );
    expect(result.questions).toHaveLength(1);
  });

  it("rechaza un HTTP de error", async () => {
    vi.stubEnv("N8N_WEBHOOK_GENERATE_INTERVIEW_URL", "https://n8n.test/hook");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("fallo", { status: 502 })),
    );
    await expect(
      callN8nGenerateInterview(toN8nGenerateInterviewPayload(setup, "u1")),
    ).rejects.toThrow(/502/);
  });
});
