import type {
  ExperienceLevel,
  InterviewQuestion,
  InterviewSetupInput,
  InterviewType,
} from "./types";

/**
 * Mapeo de tipos de entrevista de la app a los valores que espera el agente Nova de ElevenLabs.
 *
 * La app usa: 'hr' | 'tecnico' | 'no_tecnico' | 'agresivo'
 * Nova espera: 'rh' | 'tecnico' | 'agresivo'
 *
 * Nota: 'no_tecnico' se mapea a 'rh' porque representa una entrevista de habilidades blandas
 * sin enfoque técnico, similar al rol de recursos humanos.
 */
export function mapInterviewTypeToAgentRole(
  type: InterviewType,
): "rh" | "tecnico" | "agresivo" {
  switch (type) {
    case "hr":
      return "rh";
    case "tecnico":
      return "tecnico";
    case "no_tecnico":
      // No técnico: entrevista de habilidades blandas, similar a RH
      return "rh";
    case "agresivo":
      return "agresivo";
  }
}

/**
 * Mapeo de niveles de experiencia de la app a los valores que espera el agente Nova.
 *
 * La app usa: 'junior' | 'mid' | 'senior'
 * Nova espera: 'jr' | 'mid' | 'senior'
 */
export function mapExperienceLevelToDifficulty(
  level: ExperienceLevel,
): "jr" | "mid" | "senior" {
  switch (level) {
    case "junior":
      return "jr";
    case "mid":
      return "mid";
    case "senior":
      return "senior";
  }
}

/**
 * Formatea las preguntas de la entrevista como texto legible para el agente.
 */
export function formatInterviewQuestions(
  questions: InterviewQuestion[],
): string {
  if (!questions.length) return "";

  const sorted = [...questions].sort((a, b) => a.order_index - b.order_index);

  return sorted
    .map((q, index) => `${index + 1}. ${q.question_text}`)
    .join("\n");
}

/**
 * Construye la descripción del perfil del puesto para el agente.
 */
export function buildJobProfile(setup: InterviewSetupInput): string {
  const parts = [`Puesto: ${setup.role}`, `Nivel: ${setup.level}`];

  if (setup.stack?.trim()) {
    parts.push(`Stack técnico: ${setup.stack.trim()}`);
  }

  if (setup.extraContext?.trim()) {
    parts.push(`Contexto adicional: ${setup.extraContext.trim()}`);
  }

  return parts.join("\n");
}

/**
 * Construye las variables dinámicas que espera el agente Nova de ElevenLabs.
 *
 * Variables dinámicas esperadas por Nova:
 * - {{interviewer_role}}: 'rh' | 'tecnico' | 'agresivo'
 * - {{interview_difficulty}}: 'jr' | 'mid' | 'senior'
 * - {{interview_questions}}: preguntas formateadas como texto
 * - {{job_profile}}: descripción del puesto y contexto
 * - {{candidate_cv}}: texto del CV del candidato (vacío si no hay)
 *
 * @param setup - Configuración de la entrevista de la app
 * @param questions - Lista de preguntas generadas para la entrevista
 * @returns Objeto con las variables dinámicas para el agente
 */
export function buildDynamicVariables(
  setup: InterviewSetupInput,
  questions: InterviewQuestion[],
): Record<string, string> {
  return {
    interviewer_role: mapInterviewTypeToAgentRole(setup.interviewType),
    interview_difficulty: mapExperienceLevelToDifficulty(setup.level),
    interview_questions: formatInterviewQuestions(questions),
    job_profile: buildJobProfile(setup),
    candidate_cv: setup.cvText?.trim() || "",
  };
}
