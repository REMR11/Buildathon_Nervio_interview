"use client";

import { type DisconnectionDetails, useConversation } from "@elevenlabs/react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  INTERVIEW_FAREWELL_SECONDS,
  INTERVIEW_GRACEFUL_END_SECONDS,
  INTERVIEW_MAX_SECONDS,
  INTERVIEW_WARNING_SECONDS,
  TIME_LIMIT_FAREWELL_UPDATE,
  TIME_LIMIT_WARNING_UPDATE,
} from "./constants";
import { interviewService } from "./service-factory";
import { getSession, getSessionSetup, saveSession } from "./session-storage";
import type {
  InterviewMessage,
  InterviewPhase,
  InterviewSetupInput,
  OrbState,
} from "./types";

const POOR_CONNECTION_MESSAGE =
  "Entrevista finalizada: la conexión no tuvo calidad suficiente para evaluar al candidato.";

type BrowserNetworkInformation = EventTarget & {
  effectiveType?: string;
  downlink?: number;
  rtt?: number;
};

type NavigatorWithConnection = Navigator & {
  connection?: BrowserNetworkInformation;
  mozConnection?: BrowserNetworkInformation;
  webkitConnection?: BrowserNetworkInformation;
};

function getNetworkConnection(): BrowserNetworkInformation | null {
  const nav = navigator as NavigatorWithConnection;
  return nav.connection ?? nav.mozConnection ?? nav.webkitConnection ?? null;
}

function hasPoorConnection(): boolean {
  // Solo cuenta estar offline de verdad. Los heurísticos de rtt/downlink/
  // effectiveType de la Network Information API daban falsos positivos durante
  // la llamada y colgaban la entrevista sola a los pocos segundos.
  // shortcut: sin pre-aviso de red lenta; reactivar con un heurístico estable si hace falta.
  return !navigator.onLine;
}

function buildContext(setup: InterviewSetupInput): string {
  const parts = [
    `Entrevista simulada en español.`,
    `Candidato: ${setup.candidateName}`,
    `Puesto: ${setup.role}`,
    `Nivel: ${setup.level}`,
    `Tipo de entrevista: ${setup.interviewType}`,
  ];
  if (setup.stack?.trim()) parts.push(`Stack: ${setup.stack.trim()}`);
  if (setup.extraContext?.trim())
    parts.push(`Contexto: ${setup.extraContext.trim()}`);
  if (setup.cvText?.trim())
    parts.push(
      `CV del candidato (úsalo para personalizar las preguntas):\n${setup.cvText.trim()}`,
    );
  return parts.join("\n");
}

/**
 * ¿El agente o el servidor cerraron la llamada de forma normal (fin de la
 * entrevista o límite de duración)? Solo los errores reales cuentan como
 * mala conexión.
 */
function isServerEndedDisconnect(details?: DisconnectionDetails): boolean {
  if (!details) return false;
  if (details.reason === "agent") return true;
  if (details.reason !== "error") return false;
  const text = `${details.message ?? ""} ${details.closeReason ?? ""}`;
  return /max(imum)?[\s_-]*(call[\s_-]*)?duration|exceeded/i.test(text);
}

function isDurationDisconnect(details?: DisconnectionDetails): boolean {
  const text = details
    ? `${"message" in details ? (details.message ?? "") : ""} ${"closeReason" in details ? (details.closeReason ?? "") : ""}`
    : "";
  return /duration|exceeded/i.test(text);
}

function phaseToOrb(phase: InterviewPhase, isSpeaking: boolean): OrbState {
  if (phase === "connecting") return "idle";
  if (phase === "ended") return "idle";
  if (phase === "thinking") return "thinking";
  if (isSpeaking || phase === "speaking") return "speaking";
  if (phase === "listening") return "listening";
  return "idle";
}

function isSuccessEndEvent(raw: unknown): boolean {
  if (typeof raw === "string") {
    try {
      return isSuccessEndEvent(JSON.parse(raw) as unknown);
    } catch {
      return false;
    }
  }

  if (!raw || typeof raw !== "object") return false;

  const record = raw as Record<string, unknown>;
  const successEnd = record.success_end;

  if (successEnd && typeof successEnd === "object") {
    const endRecord = successEnd as Record<string, unknown>;
    return endRecord.type === "end";
  }

  return record.type === "end" && record.label === "Finalizar llamada";
}

function extractConversationId(raw: unknown): string | null {
  if (typeof raw === "string") {
    try {
      return extractConversationId(JSON.parse(raw) as unknown);
    } catch {
      return null;
    }
  }

  if (!raw || typeof raw !== "object") return null;

  const record = raw as Record<string, unknown>;
  const direct =
    typeof record.conversation_id === "string"
      ? record.conversation_id
      : typeof record.conversationId === "string"
        ? record.conversationId
        : null;

  if (direct) return direct;

  for (const value of Object.values(record)) {
    const nested = extractConversationId(value);
    if (nested) return nested;
  }

  return null;
}

function extractMessagePayload(raw: unknown): {
  role: "interviewer" | "candidate";
  text: string;
} | null {
  if (typeof raw === "string") {
    const text = raw.trim();
    return text ? { role: "interviewer", text } : null;
  }

  if (!raw || typeof raw !== "object") return null;

  const record = raw as Record<string, unknown>;
  const text =
    typeof record.message === "string"
      ? record.message
      : typeof record.text === "string"
        ? record.text
        : "";

  if (!text.trim()) return null;

  const source = String(
    record.source ?? record.role ?? record.type ?? "",
  ).toLowerCase();
  const role =
    source.includes("user") || source.includes("human")
      ? "candidate"
      : "interviewer";

  return { role, text: text.trim() };
}

export function useInterviewConversation(sessionId: string) {
  const setup = getSessionSetup(sessionId);
  const [messages, setMessages] = useState<InterviewMessage[]>(
    () => getSession(sessionId)?.messages ?? [],
  );
  const [currentQuestion, setCurrentQuestion] = useState("");
  const [phase, setPhase] = useState<InterviewPhase>("connecting");
  const [error, setError] = useState<string | null>(null);
  const [endEventReceived, setEndEventReceived] = useState(false);
  const [agentEnded, setAgentEnded] = useState(false);
  const [agentReportReady, setAgentReportReady] = useState(false);
  const [endedByPoorConnection, setEndedByPoorConnection] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const startedRef = useRef(false);
  const contextSentRef = useRef(false);
  const endPersistedRef = useRef(false);
  const expectedDisconnectRef = useRef(false);
  const poorConnectionHandledRef = useRef(false);
  const connectedAtRef = useRef<number | null>(null);
  const warningSentRef = useRef(false);
  const farewellSentRef = useRef(false);
  const [remainingSeconds, setRemainingSeconds] = useState(
    INTERVIEW_MAX_SECONDS,
  );
  const [timeWarning, setTimeWarning] = useState(false);
  const [timeLimitReached, setTimeLimitReached] = useState(false);

  const markPoorConnection = useCallback(() => {
    if (poorConnectionHandledRef.current) return;

    poorConnectionHandledRef.current = true;
    setEndedByPoorConnection(true);
    setError(POOR_CONNECTION_MESSAGE);
    setPhase("ended");

    const session = getSession(sessionId);
    if (session) {
      saveSession({ ...session, status: "ended" });
    }
  }, [sessionId]);

  const appendMessage = useCallback(
    (role: "interviewer" | "candidate", text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;

      const msg: InterviewMessage = {
        id: crypto.randomUUID(),
        role,
        text: trimmed,
        timestamp: Date.now(),
      };

      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === role && last.text === trimmed) return prev;

        const next = [...prev, msg];
        const session = getSession(sessionId);
        if (session) {
          saveSession({ ...session, messages: next });
        }
        return next;
      });

      if (role === "interviewer") {
        setCurrentQuestion(trimmed);
      }

      void interviewService
        .sendMessage(sessionId, { role, text: trimmed })
        .catch((err) => {
          console.error("No se pudo persistir mensaje de entrevista:", err);
        });
    },
    [sessionId],
  );

  const conversation = useConversation({
    onConnect: ({ conversationId }) => {
      setConversationId(conversationId);
      connectedAtRef.current ??= Date.now();
      setPhase("listening");
      setError(null);
    },
    onDisconnect: (details) => {
      if (expectedDisconnectRef.current) {
        setPhase((current) => (current === "ended" ? current : "ended"));
        return;
      }

      const startedAt = connectedAtRef.current;
      const nearLimit =
        startedAt !== null &&
        (Date.now() - startedAt) / 1000 >=
          INTERVIEW_MAX_SECONDS - INTERVIEW_FAREWELL_SECONDS;

      if (isServerEndedDisconnect(details) || nearLimit) {
        // Cierre normal (Nova colgó o se alcanzó el límite): flujo de fin, no error.
        expectedDisconnectRef.current = true;
        if (nearLimit || isDurationDisconnect(details)) {
          setTimeLimitReached(true);
        }
        setEndEventReceived(true);
        return;
      }

      console.warn("Desconexión inesperada del agente:", details);
      markPoorConnection();
    },
    onMessage: (message) => {
      const messageConversationId = extractConversationId(message);
      if (messageConversationId) setConversationId(messageConversationId);

      if (isSuccessEndEvent(message)) {
        setEndEventReceived(true);
        return;
      }

      const parsed = extractMessagePayload(message);
      if (parsed) appendMessage(parsed.role, parsed.text);
    },
    onModeChange: ({ mode }) => {
      setPhase(mode === "speaking" ? "speaking" : "listening");
    },
    onError: (err) => {
      const message =
        typeof err === "string" ? err : "Error de conexión con el agente";
      setError(message);
    },
  });

  const {
    status,
    isSpeaking,
    isMuted,
    setMuted,
    startSession,
    endSession,
    sendContextualUpdate,
    message,
  } = conversation;

  const isSpeakingRef = useRef(false);
  isSpeakingRef.current = isSpeaking;

  const closeForPoorConnection = useCallback(() => {
    expectedDisconnectRef.current = true;
    markPoorConnection();
    endSession();
  }, [endSession, markPoorConnection]);

  // Cuenta regresiva desde que conecta: aviso a los 2 min, despedida a los 30 s
  // y cierre propio a los 10 s para que ElevenLabs nunca corte de golpe.
  useEffect(() => {
    if (status !== "connected") return;
    const tick = () => {
      const startedAt = connectedAtRef.current;
      if (startedAt === null) return;
      const remaining = Math.max(
        0,
        INTERVIEW_MAX_SECONDS - Math.floor((Date.now() - startedAt) / 1000),
      );
      setRemainingSeconds(remaining);

      if (remaining <= INTERVIEW_WARNING_SECONDS && !warningSentRef.current) {
        warningSentRef.current = true;
        setTimeWarning(true);
        sendContextualUpdate(TIME_LIMIT_WARNING_UPDATE);
      }
      if (remaining <= INTERVIEW_FAREWELL_SECONDS && !farewellSentRef.current) {
        farewellSentRef.current = true;
        sendContextualUpdate(TIME_LIMIT_FAREWELL_UPDATE);
      }
      // Tras la despedida: colgar cuando Nova termine de hablar, o a los 10 s
      // restantes como máximo.
      const farewellDone =
        farewellSentRef.current &&
        !isSpeakingRef.current &&
        remaining <= INTERVIEW_FAREWELL_SECONDS - 12;
      if (
        (remaining <= INTERVIEW_GRACEFUL_END_SECONDS || farewellDone) &&
        !endPersistedRef.current
      ) {
        setTimeLimitReached(true);
        setEndEventReceived(true);
      }
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [status, sendContextualUpdate]);

  useEffect(() => {
    if (message?.trim()) {
      setCurrentQuestion(message.trim());
    }
  }, [message]);

  useEffect(() => {
    const handleConnectionChange = () => {
      if (hasPoorConnection()) {
        closeForPoorConnection();
      }
    };

    window.addEventListener("offline", handleConnectionChange);
    const connection = getNetworkConnection();
    connection?.addEventListener("change", handleConnectionChange);
    handleConnectionChange();

    return () => {
      window.removeEventListener("offline", handleConnectionChange);
      connection?.removeEventListener("change", handleConnectionChange);
    };
  }, [closeForPoorConnection]);

  useEffect(() => {
    if (!endEventReceived || endPersistedRef.current) return;
    endPersistedRef.current = true;

    const closeCall = async () => {
      setPhase("ended");
      expectedDisconnectRef.current = true;
      endSession();
      const session = getSession(sessionId);
      if (session) {
        saveSession({ ...session, status: "ended" });
      }

      try {
        const result = await interviewService.end(sessionId, conversationId, {
          reason: timeLimitReachedRef.current ? "time_limit" : "agent",
        });
        setAgentReportReady(Boolean(result.reportReady));
      } catch (err) {
        console.error("No se pudo cerrar la entrevista sin score:", err);
      } finally {
        setAgentEnded(true);
      }
    };

    void closeCall();
  }, [conversationId, endEventReceived, endSession, sessionId]);

  const timeLimitReachedRef = useRef(false);
  timeLimitReachedRef.current = timeLimitReached;

  useEffect(() => {
    if (status !== "connected" || !setup || contextSentRef.current) return;
    contextSentRef.current = true;
    sendContextualUpdate(buildContext(setup));
  }, [status, setup, sendContextualUpdate]);

  useEffect(() => {
    if (!setup || startedRef.current) return;
    startedRef.current = true;

    const connect = async () => {
      try {
        setPhase("connecting");
        if (hasPoorConnection()) {
          closeForPoorConnection();
          return;
        }

        await navigator.mediaDevices.getUserMedia({ audio: true });

        const response = await fetch("/api/elevenlabs/token");
        if (!response.ok) {
          const body = (await response.json().catch(() => ({}))) as {
            error?: string;
          };
          throw new Error(
            response.status === 429
              ? (body.error ??
                  "Has alcanzado el límite de entrevistas. Espera un momento.")
              : (body.error ?? "No se pudo conectar con ElevenLabs"),
          );
        }

        const { token } = (await response.json()) as { token: string };
        const inputDeviceId =
          window.sessionStorage.getItem("nervio:input-device") || undefined;
        startSession({ conversationToken: token, inputDeviceId });
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Error al iniciar la conversación",
        );
        setPhase("ended");
      }
    };

    void connect();

    return () => {
      expectedDisconnectRef.current = true;
      endSession();
    };
  }, [setup, startSession, endSession, closeForPoorConnection]);

  const toggleMute = useCallback(() => {
    setMuted(!isMuted);
  }, [isMuted, setMuted]);

  const endInterview = useCallback(() => {
    setPhase("ended");
    expectedDisconnectRef.current = true;
    endSession();
    const session = getSession(sessionId);
    if (session) {
      saveSession({ ...session, status: "ended" });
    }
  }, [endSession, sessionId]);

  const connectionLabel =
    status === "connected"
      ? "En vivo"
      : status === "connecting"
        ? "Conectando..."
        : error
          ? "Error"
          : "Desconectado";

  return {
    setup,
    phase,
    orbState: phaseToOrb(phase, isSpeaking),
    currentQuestion,
    messages,
    isMuted,
    isBusy: status === "connecting",
    error,
    connectionLabel,
    agentEnded,
    agentReportReady,
    endedByPoorConnection,
    timeLimitReached,
    timeWarning,
    remainingSeconds,
    conversationId,
    toggleMute,
    endInterview,
  };
}
