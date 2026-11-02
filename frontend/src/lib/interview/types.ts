export type InterviewType = "hr" | "tecnico" | "no_tecnico" | "agresivo";

export type ExperienceLevel = "junior" | "mid" | "senior";

export type InterviewLanguage = "es" | "en" | "pt";

export type InterviewPhase =
  | "connecting"
  | "speaking"
  | "listening"
  | "thinking"
  | "ended";

export type OrbState = "idle" | "speaking" | "listening" | "thinking";

export interface InterviewSetupInput {
  role: string;
  candidateName: string;
  level: ExperienceLevel;
  language: InterviewLanguage;
  interviewType: InterviewType;
  stack?: string;
  extraContext: string;
  /** CV subido (candidate_cvs.id), si el candidato adjuntó uno. */
  cvId?: string | null;
  /** Texto del CV (editable en la vista previa), máx. 8000 caracteres. */
  cvText?: string;
}

export interface InterviewQuestion {
  session_id: string;
  question_text: string;
  order_index: number;
  is_followup: boolean;
  id?: string;
}

export interface StartInterviewResponse {
  sessionId: string;
  questions: InterviewQuestion[];
  question: {
    text: string;
    order_index: number;
    is_followup: boolean;
  };
  audioUrl: string | null;
}

export interface InterviewMessage {
  id: string;
  role: "interviewer" | "candidate";
  text: string;
  timestamp: number;
}

export interface InterviewTurn {
  interviewerMessage?: string;
  isComplete: boolean;
  phase: InterviewPhase;
}

export interface CloseInterviewResponse {
  sessionId: string;
  status: "ended";
  reportReady?: boolean;
}

export type InterviewEndReason =
  | "manual"
  | "agent"
  | "poor_connection"
  | "time_limit";

export interface EndInterviewOptions {
  reason?: InterviewEndReason;
  skipEvaluation?: boolean;
}

export interface InterviewReport {
  sessionId: string;
  scoreGlobal: number;
  scoreClarity: number;
  scoreKnowledge: number;
  scoreConfidence: number;
  scoreStructure: number;
  strengths: string[];
  weaknesses: string[];
  recommendation: string;
  interviewType: InterviewType;
  role: string;
  candidateName: string;
  transcript: TranscriptItem[];
  /** elevenlabs: transcripción oficial; local: reconstruida desde los mensajes; none: no hay datos. */
  transcriptSource: "elevenlabs" | "local" | "none";
}

export interface TranscriptItem {
  order: number;
  question: string;
  answer: string;
  questionAtSecs: number | null;
  answerAtSecs: number | null;
  feedback: string;
  score: number | null;
  suggestion: string | null;
  /** elevenlabs: análisis de IA post-llamada; heuristic: análisis automático básico local. */
  feedbackSource: "elevenlabs" | "heuristic";
}

export interface PersistedInterviewSession {
  id: string;
  setup: InterviewSetupInput;
  messages: InterviewMessage[];
  questions: InterviewQuestion[];
  status: "active" | "ended" | "scheduled";
  startedAt: number | null;
  scheduledAt?: string | null;
}

export interface ScheduleInterviewInput extends InterviewSetupInput {
  scheduledAt: string;
  reminderOffsetMinutes: number;
}

export interface ScheduleInterviewResponse {
  sessionId: string;
  scheduleId: string;
  scheduledAt: string;
  emailSent: boolean;
  joinUrl: string;
}

export type UpdateScheduleInput = ScheduleInterviewInput;

export interface UpdateScheduleResponse {
  scheduleId: string;
  sessionId: string;
  scheduledAt: string;
}

export interface InterviewReportSummary {
  sessionId: string;
  role: string;
  interviewType: InterviewType;
  scoreGlobal: number | null;
  status: string;
  endedAt: string | null;
  createdAt: string;
}

export interface MockSessionState {
  id: string;
  setup: InterviewSetupInput;
  messages: InterviewMessage[];
  questions: InterviewQuestion[];
  questionIndex: number;
  startedAt: number;
  status: "active" | "ended";
  audioUrl?: string | null;
}
