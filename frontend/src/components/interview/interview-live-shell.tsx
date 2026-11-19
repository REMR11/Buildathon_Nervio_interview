"use client";

import { IconArrowLeft, IconClock } from "@tabler/icons-react";
import Link from "next/link";
import { InterviewBubble } from "@/components/interview/interview-bubble";
import { InterviewControls } from "@/components/interview/interview-controls";
import { InterviewOrb } from "@/components/interview/interview-orb";
import { InterviewTimeline } from "@/components/interview/interview-timeline";
import { AuthBackground } from "@/components/layout/auth-background";
import { Button } from "@/components/ui/button";
import { INTERVIEW_TYPE_OPTIONS } from "@/lib/interview/constants";
import type {
  InterviewPhase,
  InterviewType,
  OrbState,
} from "@/lib/interview/types";

interface InterviewLiveShellProps {
  sessionId: string;
  interviewType: InterviewType;
  role: string;
  elapsedSeconds: number;
  /** Segundos que quedan antes del límite de duración. */
  remainingSeconds: number;
  /** Mostrar el aviso de "quedan 2 minutos". */
  timeWarning?: boolean;
  phase: InterviewPhase;
  orbState: OrbState;
  currentQuestion: string;
  messages: import("@/lib/interview/types").InterviewMessage[];
  isMuted: boolean;
  isBusy: boolean;
  connectionLabel: string;
  error?: string | null;
  onToggleMute: () => void;
  onEndInterview: () => void;
}

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export function InterviewLiveShell({
  sessionId,
  interviewType,
  role,
  elapsedSeconds,
  remainingSeconds,
  timeWarning,
  phase,
  orbState,
  currentQuestion,
  messages,
  isMuted,
  isBusy,
  connectionLabel,
  error,
  onToggleMute,
  onEndInterview,
}: InterviewLiveShellProps) {
  const typeLabel =
    INTERVIEW_TYPE_OPTIONS.find((o) => o.value === interviewType)?.label ??
    interviewType;

  return (
    <>
      <AuthBackground />
      <div className="relative z-10 flex min-h-screen flex-col">
        <header className="flex items-center justify-between border-b border-white/5 bg-background/40 px-6 py-4 backdrop-blur-md">
          <Button
            variant="ghost"
            size="sm"
            render={<Link href="/interview/setup" />}
          >
            <IconArrowLeft className="size-4" data-icon="inline-start" />
            Salir
          </Button>

          <div className="flex flex-col items-center gap-1">
            <span className="rounded-full border border-primary/30 bg-primary/10 px-3 py-0.5 text-xs font-medium text-primary">
              {typeLabel}
            </span>
            <span className="text-sm text-muted-foreground">{role}</span>
          </div>

          <span
            className="flex flex-col items-end font-mono text-sm text-muted-foreground"
            title="Tiempo transcurrido / restante"
          >
            <span>{formatTime(elapsedSeconds)}</span>
            <span
              className={
                remainingSeconds <= 120
                  ? "text-xs font-semibold text-amber-400"
                  : "text-xs"
              }
            >
              −{formatTime(remainingSeconds)}
            </span>
          </span>
        </header>
        {timeWarning ? (
          <output className="fixed top-20 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2 rounded-full border border-amber-400/40 bg-amber-500/15 px-4 py-2 text-sm text-amber-200 shadow-lg backdrop-blur-md">
            <IconClock className="size-4" />
            Quedan unos 2 minutos: Nova va a cerrar la entrevista.
          </output>
        ) : null}

        <main className="flex flex-1 flex-col items-center justify-center gap-5 px-6 py-6 sm:gap-6">
          <InterviewOrb state={orbState} className="size-64 sm:size-80" />
          <InterviewBubble
            text={
              currentQuestion ||
              (phase === "connecting"
                ? "Conectando con el entrevistador..."
                : phase === "ended"
                  ? (error ?? "Entrevista finalizada")
                  : "La conversación está en curso")
            }
            phase={phase}
          />
        </main>

        <footer className="border-t border-white/5 bg-background/30 px-6 py-4 backdrop-blur-md">
          <div className="mx-auto mb-3 flex max-w-2xl justify-center">
            <InterviewTimeline messages={messages} />
          </div>
          <div className="mx-auto flex justify-center">
            <InterviewControls
              phase={phase}
              isMuted={isMuted}
              isBusy={isBusy}
              connectionLabel={connectionLabel}
              error={error}
              onToggleMute={onToggleMute}
              onEndInterview={onEndInterview}
              className="max-w-2xl"
            />
          </div>
          <p className="mt-3 text-center text-xs text-muted-foreground/60">
            Sesión {sessionId.slice(0, 8)}...
          </p>
        </footer>
      </div>
    </>
  );
}
