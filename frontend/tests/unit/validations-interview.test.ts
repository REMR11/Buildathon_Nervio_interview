import { describe, expect, it } from "vitest";
import {
  interviewSetupSchema,
  scheduleInterviewSchema,
} from "@/lib/validations/interview";

const setup = {
  role: "Frontend Engineer",
  candidateName: "Candidato Prueba",
  level: "mid" as const,
  language: "es" as const,
  interviewType: "tecnico" as const,
  extraContext: "Perfil ficticio para pruebas automatizadas.",
};

describe("interviewSetupSchema", () => {
  it("acepta un setup válido", () => {
    expect(interviewSetupSchema.safeParse(setup).success).toBe(true);
  });

  it("rechaza un extraContext corto", () => {
    expect(
      interviewSetupSchema.safeParse({ ...setup, extraContext: "corto" })
        .success,
    ).toBe(false);
  });

  it("rechaza un nivel desconocido", () => {
    expect(
      interviewSetupSchema.safeParse({ ...setup, level: " intern" }).success,
    ).toBe(false);
  });

  it("rechaza un cvId que no es UUID", () => {
    expect(
      interviewSetupSchema.safeParse({ ...setup, cvId: "no-uuid" }).success,
    ).toBe(false);
  });

  it("acepta cvId nulo", () => {
    expect(
      interviewSetupSchema.safeParse({ ...setup, cvId: null }).success,
    ).toBe(true);
  });
});

describe("scheduleInterviewSchema", () => {
  it("acepta una cita futura con recordatorio coherente", () => {
    const scheduledAt = new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString();
    const parsed = scheduleInterviewSchema.safeParse({
      ...setup,
      scheduledAt,
      reminderOffsetMinutes: 60,
    });
    expect(parsed.success).toBe(true);
  });

  it("rechaza una fecha pasada", () => {
    const parsed = scheduleInterviewSchema.safeParse({
      ...setup,
      scheduledAt: new Date(Date.now() - 60_000).toISOString(),
      reminderOffsetMinutes: 15,
    });
    expect(parsed.success).toBe(false);
  });

  it("rechaza un recordatorio que caería en el pasado", () => {
    const parsed = scheduleInterviewSchema.safeParse({
      ...setup,
      scheduledAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      reminderOffsetMinutes: 60,
    });
    expect(parsed.success).toBe(false);
  });
});
