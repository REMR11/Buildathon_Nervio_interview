import { describe, expect, it } from "vitest";
import {
  buildDynamicVariables,
  buildJobProfile,
  formatInterviewQuestions,
  mapExperienceLevelToDifficulty,
  mapInterviewTypeToAgentRole,
} from "@/lib/interview/dynamic-variables";
import type {
  InterviewQuestion,
  InterviewSetupInput,
} from "@/lib/interview/types";

describe("mapInterviewTypeToAgentRole", () => {
  it("mapea 'hr' a 'rh'", () => {
    expect(mapInterviewTypeToAgentRole("hr")).toBe("rh");
  });

  it("mapea 'tecnico' a 'tecnico'", () => {
    expect(mapInterviewTypeToAgentRole("tecnico")).toBe("tecnico");
  });

  it("mapea 'no_tecnico' a 'rh'", () => {
    expect(mapInterviewTypeToAgentRole("no_tecnico")).toBe("rh");
  });

  it("mapea 'agresivo' a 'agresivo'", () => {
    expect(mapInterviewTypeToAgentRole("agresivo")).toBe("agresivo");
  });
});

describe("mapExperienceLevelToDifficulty", () => {
  it("mapea 'junior' a 'jr'", () => {
    expect(mapExperienceLevelToDifficulty("junior")).toBe("jr");
  });

  it("mapea 'mid' a 'mid'", () => {
    expect(mapExperienceLevelToDifficulty("mid")).toBe("mid");
  });

  it("mapea 'senior' a 'senior'", () => {
    expect(mapExperienceLevelToDifficulty("senior")).toBe("senior");
  });
});

describe("formatInterviewQuestions", () => {
  it("retorna string vacío si no hay preguntas", () => {
    expect(formatInterviewQuestions([])).toBe("");
  });

  it("formatea una sola pregunta", () => {
    const questions: InterviewQuestion[] = [
      {
        session_id: "test-session",
        question_text: "¿Cuál es tu experiencia?",
        order_index: 1,
        is_followup: false,
      },
    ];

    expect(formatInterviewQuestions(questions)).toBe(
      "1. ¿Cuál es tu experiencia?",
    );
  });

  it("formatea múltiples preguntas en orden", () => {
    const questions: InterviewQuestion[] = [
      {
        session_id: "test-session",
        question_text: "Segunda pregunta",
        order_index: 2,
        is_followup: false,
      },
      {
        session_id: "test-session",
        question_text: "Primera pregunta",
        order_index: 1,
        is_followup: false,
      },
      {
        session_id: "test-session",
        question_text: "Tercera pregunta",
        order_index: 3,
        is_followup: true,
      },
    ];

    const result = formatInterviewQuestions(questions);
    expect(result).toBe(
      "1. Primera pregunta\n2. Segunda pregunta\n3. Tercera pregunta",
    );
  });
});

describe("buildJobProfile", () => {
  it("construye perfil básico sin stack ni contexto", () => {
    const setup: InterviewSetupInput = {
      role: "Desarrollador Full Stack",
      candidateName: "Juan Pérez",
      level: "mid",
      language: "es",
      interviewType: "tecnico",
      extraContext: "",
    };

    const result = buildJobProfile(setup);
    expect(result).toBe("Puesto: Desarrollador Full Stack\nNivel: mid");
  });

  it("incluye stack técnico cuando está presente", () => {
    const setup: InterviewSetupInput = {
      role: "Backend Developer",
      candidateName: "Ana García",
      level: "senior",
      language: "es",
      interviewType: "tecnico",
      stack: "Node.js, PostgreSQL, Docker",
      extraContext: "",
    };

    const result = buildJobProfile(setup);
    expect(result).toContain("Stack técnico: Node.js, PostgreSQL, Docker");
  });

  it("incluye contexto adicional cuando está presente", () => {
    const setup: InterviewSetupInput = {
      role: "Frontend Developer",
      candidateName: "Carlos López",
      level: "junior",
      language: "es",
      interviewType: "hr",
      extraContext: "Startup en crecimiento, trabajo remoto",
    };

    const result = buildJobProfile(setup);
    expect(result).toContain(
      "Contexto adicional: Startup en crecimiento, trabajo remoto",
    );
  });

  it("ignora espacios vacíos en stack y contexto", () => {
    const setup: InterviewSetupInput = {
      role: "DevOps Engineer",
      candidateName: "María Rodríguez",
      level: "mid",
      language: "es",
      interviewType: "tecnico",
      stack: "   ",
      extraContext: "\t\n",
    };

    const result = buildJobProfile(setup);
    expect(result).toBe("Puesto: DevOps Engineer\nNivel: mid");
  });
});

describe("buildDynamicVariables", () => {
  it("construye todas las variables dinámicas correctamente", () => {
    const setup: InterviewSetupInput = {
      role: "Full Stack Developer",
      candidateName: "Pedro Martínez",
      level: "senior",
      language: "es",
      interviewType: "tecnico",
      stack: "React, Node.js, PostgreSQL",
      extraContext: "Empresa fintech",
      cvText: "Experiencia: 8 años en desarrollo web...",
    };

    const questions: InterviewQuestion[] = [
      {
        session_id: "test",
        question_text: "¿Cómo manejas el state en React?",
        order_index: 1,
        is_followup: false,
      },
      {
        session_id: "test",
        question_text: "Explica tu arquitectura backend",
        order_index: 2,
        is_followup: false,
      },
    ];

    const result = buildDynamicVariables(setup, questions);

    expect(result.interviewer_role).toBe("tecnico");
    expect(result.interview_difficulty).toBe("senior");
    expect(result.interview_questions).toBe(
      "1. ¿Cómo manejas el state en React?\n2. Explica tu arquitectura backend",
    );
    expect(result.job_profile).toContain("Full Stack Developer");
    expect(result.job_profile).toContain("senior");
    expect(result.job_profile).toContain("React, Node.js, PostgreSQL");
    expect(result.candidate_cv).toBe(
      "Experiencia: 8 años en desarrollo web...",
    );
  });

  it("maneja CV vacío correctamente", () => {
    const setup: InterviewSetupInput = {
      role: "QA Engineer",
      candidateName: "Laura Fernández",
      level: "junior",
      language: "es",
      interviewType: "hr",
      extraContext: "",
    };

    const questions: InterviewQuestion[] = [];

    const result = buildDynamicVariables(setup, questions);

    expect(result.candidate_cv).toBe("");
  });

  it("mapea correctamente 'hr' a 'rh' y 'junior' a 'jr'", () => {
    const setup: InterviewSetupInput = {
      role: "Product Manager",
      candidateName: "Diego Ruiz",
      level: "junior",
      language: "es",
      interviewType: "hr",
      extraContext: "",
    };

    const result = buildDynamicVariables(setup, []);

    expect(result.interviewer_role).toBe("rh");
    expect(result.interview_difficulty).toBe("jr");
  });

  it("mapea correctamente 'no_tecnico' a 'rh'", () => {
    const setup: InterviewSetupInput = {
      role: "Account Manager",
      candidateName: "Sofia Jiménez",
      level: "mid",
      language: "es",
      interviewType: "no_tecnico",
      extraContext: "",
    };

    const result = buildDynamicVariables(setup, []);

    expect(result.interviewer_role).toBe("rh");
  });

  it("mapea correctamente 'agresivo' y limpia espacios del CV", () => {
    const setup: InterviewSetupInput = {
      role: "Senior Architect",
      candidateName: "Roberto Sánchez",
      level: "senior",
      language: "es",
      interviewType: "agresivo",
      extraContext: "",
      cvText: "  CV con espacios  \n\n  ",
    };

    const result = buildDynamicVariables(setup, []);

    expect(result.interviewer_role).toBe("agresivo");
    expect(result.candidate_cv).toBe("CV con espacios");
  });
});
