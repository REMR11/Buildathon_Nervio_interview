import { describe, expect, it } from "vitest";
import {
  getInterviewTimePhase,
  INTERVIEW_FAREWELL_SECONDS,
  INTERVIEW_GRACEFUL_END_SECONDS,
  INTERVIEW_MAX_SECONDS,
  INTERVIEW_WARNING_SECONDS,
  remainingInterviewSeconds,
} from "@/lib/interview/constants";

describe("límite de 20 minutos", () => {
  it("define 1200 segundos de tope", () => {
    expect(INTERVIEW_MAX_SECONDS).toBe(20 * 60);
  });

  it("calcula el tiempo restante sin ir por debajo de 0", () => {
    const started = 1_000_000;
    expect(remainingInterviewSeconds(started, started)).toBe(
      INTERVIEW_MAX_SECONDS,
    );
    expect(remainingInterviewSeconds(started, started + 5 * 60 * 1000)).toBe(
      INTERVIEW_MAX_SECONDS - 300,
    );
    expect(remainingInterviewSeconds(started, started + 30 * 60 * 1000)).toBe(
      0,
    );
  });

  it("clasifica las fases del cierre suave", () => {
    expect(getInterviewTimePhase(INTERVIEW_MAX_SECONDS)).toBe("running");
    expect(getInterviewTimePhase(INTERVIEW_WARNING_SECONDS)).toBe("warning");
    expect(getInterviewTimePhase(INTERVIEW_FAREWELL_SECONDS)).toBe("farewell");
    expect(getInterviewTimePhase(INTERVIEW_GRACEFUL_END_SECONDS)).toBe(
      "graceful_end",
    );
    expect(getInterviewTimePhase(0)).toBe("expired");
    expect(getInterviewTimePhase(-3)).toBe("expired");
  });

  it("prioriza el umbral más urgente cuando varios coinciden", () => {
    expect(getInterviewTimePhase(10)).toBe("graceful_end");
    expect(getInterviewTimePhase(30)).toBe("farewell");
    expect(getInterviewTimePhase(120)).toBe("warning");
    expect(getInterviewTimePhase(121)).toBe("running");
  });
});
