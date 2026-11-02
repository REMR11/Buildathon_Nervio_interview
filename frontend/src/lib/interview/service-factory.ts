import { apiInterviewService } from "./api-service";
import type { InterviewService } from "./interview-service";
import { mockInterviewService } from "./mock-service";

/**
 * Usa mock local si NEXT_PUBLIC_USE_MOCK_INTERVIEW=true.
 * Por defecto usa start local + agente ElevenLabs en la sala en vivo.
 */
export function getInterviewService(): InterviewService {
  if (process.env.NEXT_PUBLIC_USE_MOCK_INTERVIEW === "true") {
    return mockInterviewService;
  }
  return apiInterviewService;
}

export const interviewService = getInterviewService();
