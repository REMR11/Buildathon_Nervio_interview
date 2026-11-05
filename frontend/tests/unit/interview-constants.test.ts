import { describe, expect, it } from "vitest";
import { getMockQuestions } from "@/lib/interview/constants";

describe("getMockQuestions", () => {
  it("devuelve preguntas distintas por tipo", () => {
    const hr = getMockQuestions("hr");
    const tech = getMockQuestions("tecnico");
    expect(hr.length).toBeGreaterThan(0);
    expect(tech.length).toBeGreaterThan(0);
    expect(hr[0]).not.toBe(tech[0]);
  });
});
