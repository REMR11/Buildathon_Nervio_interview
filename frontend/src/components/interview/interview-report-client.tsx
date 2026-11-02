"use client";

import {
  IconArrowLeft,
  IconChartBar,
  IconChevronDown,
  IconMessages,
  IconPlayerPlay,
  IconThumbDown,
  IconThumbUp,
} from "@tabler/icons-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { InterviewRecordingPlayer } from "@/components/interview/interview-recording-player";
import { InterviewReportActions } from "@/components/interview/interview-report-actions";
import { AuthBackground } from "@/components/layout/auth-background";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { ReportReadyNotice } from "@/components/realtime/report-ready-notice";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { INTERVIEW_TYPE_OPTIONS, interviewService } from "@/lib/interview";
import type { InterviewReport, TranscriptItem } from "@/lib/interview/types";

interface InterviewReportClientProps {
  sessionId: string;
}

function formatSecs(secs: number | null) {
  if (secs === null) return null;
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function scoreTone(score: number | null) {
  if (score === null) return "bg-muted text-muted-foreground";
  if (score >= 75) return "bg-emerald-500/15 text-emerald-600";
  if (score >= 55) return "bg-amber-500/15 text-amber-600";
  return "bg-red-500/15 text-red-600";
}

function SeekButton({
  label,
  secs,
  onSeek,
}: {
  label: string;
  secs: number | null;
  onSeek?: (secs: number) => void;
}) {
  const time = formatSecs(secs);
  if (!time || secs === null) return null;
  if (!onSeek) {
    return (
      <span>
        {label} {time}
      </span>
    );
  }
  return (
    <button
      type="button"
      onClick={() => onSeek(secs)}
      className="inline-flex items-center gap-1 rounded-md px-1 text-primary underline-offset-2 hover:underline"
      aria-label={`Reproducir desde ${time}`}
    >
      <IconPlayerPlay className="size-3" />
      {label} {time}
    </button>
  );
}

function TranscriptEntry({
  item,
  onSeek,
}: {
  item: TranscriptItem;
  onSeek?: (secs: number) => void;
}) {
  const questionAt = formatSecs(item.questionAtSecs);

  return (
    <details className="group rounded-xl border border-border/60 bg-background/40">
      <summary className="flex cursor-pointer list-none items-start gap-3 p-4 [&::-webkit-details-marker]:hidden">
        <span className="mt-0.5 shrink-0 text-xs font-semibold text-muted-foreground">
          P{item.order}
        </span>
        <span className="flex-1 text-sm font-medium">{item.question}</span>
        {item.score !== null ? (
          <span
            className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${scoreTone(item.score)}`}
          >
            {item.score}
          </span>
        ) : null}
        <IconChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
      </summary>
      <div className="space-y-3 border-t border-border/60 p-4 text-sm">
        {questionAt ? (
          <p className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <SeekButton
              label="Pregunta en"
              secs={item.questionAtSecs}
              onSeek={onSeek}
            />
            <SeekButton
              label="Respuesta en"
              secs={item.answerAtSecs}
              onSeek={onSeek}
            />
          </p>
        ) : null}
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Tu respuesta
          </p>
          <p className="leading-relaxed">{item.answer}</p>
        </div>
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Feedback
          </p>
          <p className="leading-relaxed text-muted-foreground">
            {item.feedback}
          </p>
        </div>
        {item.suggestion ? (
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Sugerencia
            </p>
            <p className="leading-relaxed text-muted-foreground">
              {item.suggestion}
            </p>
          </div>
        ) : null}
        <p className="text-xs text-muted-foreground/80">
          {item.feedbackSource === "elevenlabs"
            ? "Análisis de IA post-entrevista"
            : "Análisis automático básico"}
        </p>
      </div>
    </details>
  );
}

function ScoreRing({ score }: { score: number }) {
  const circumference = 2 * Math.PI * 54;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="relative size-36">
      <svg
        className="size-full -rotate-90"
        viewBox="0 0 120 120"
        role="img"
        aria-label={`Puntaje ${score} de 100`}
      >
        <circle
          cx="60"
          cy="60"
          r="54"
          fill="none"
          stroke="currentColor"
          strokeWidth="8"
          className="text-muted/40"
        />
        <circle
          cx="60"
          cy="60"
          r="54"
          fill="none"
          stroke="url(#scoreGradient)"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-700"
        />
        <defs>
          <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#8aebff" />
            <stop offset="100%" stopColor="#ddb7ff" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-[family-name:var(--font-heading)] text-3xl font-bold gradient-text">
          {score}
        </span>
        <span className="text-xs text-muted-foreground">/ 100</span>
      </div>
    </div>
  );
}

function MetricBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">{value}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted/60">
        <div
          className="h-full rounded-full bg-gradient-to-r from-primary to-secondary transition-all duration-700"
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

export function InterviewReportClient({
  sessionId,
}: InterviewReportClientProps) {
  const [report, setReport] = useState<InterviewReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [audioAvailable, setAudioAvailable] = useState(false);

  const seekTo = useCallback((secs: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = secs;
    void audio.play().catch(() => undefined);
    audio.scrollIntoView({ behavior: "smooth", block: "center" });
  }, []);

  // biome-ignore lint/correctness/useExhaustiveDependencies: reloadKey fuerza la recarga al llegar `report.ready`
  useEffect(() => {
    interviewService
      .getReport(sessionId)
      .then(setReport)
      .catch(() => setError("Aún no hay reporte para esta sesión."));
  }, [sessionId, reloadKey]);

  if (error) {
    return (
      <>
        <AuthBackground />
        <SiteHeader />
        <main className="relative z-10 flex min-h-screen flex-col items-center justify-center gap-4 px-6">
          <p className="text-muted-foreground">{error}</p>
          <ReportReadyNotice
            sessionId={sessionId}
            onReady={() => {
              setError(null);
              setReloadKey((k) => k + 1);
            }}
          />
          <Button render={<Link href="/interview/setup" />}>
            Nueva entrevista
          </Button>
        </main>
        <SiteFooter />
      </>
    );
  }

  if (!report) {
    return (
      <>
        <AuthBackground />
        <div className="relative z-10 flex min-h-screen items-center justify-center">
          <Spinner className="size-8" />
        </div>
      </>
    );
  }

  const typeLabel =
    INTERVIEW_TYPE_OPTIONS.find((o) => o.value === report.interviewType)
      ?.label ?? report.interviewType;

  return (
    <>
      <AuthBackground />
      <SiteHeader />
      <main className="relative z-10 mx-auto flex min-h-screen max-w-3xl flex-col gap-8 px-6 py-28">
        <div className="text-center">
          <p className="text-sm text-muted-foreground">Reporte final</p>
          <h1 className="mt-2 font-[family-name:var(--font-heading)] text-3xl font-bold gradient-text">
            {report.candidateName}
          </h1>
          <p className="mt-1 text-muted-foreground">
            {report.role} · {typeLabel}
          </p>
        </div>

        <div className="glass-panel glow-cyan flex flex-col items-center gap-6 rounded-2xl p-8 sm:flex-row sm:justify-around">
          <ScoreRing score={report.scoreGlobal} />
          <div className="w-full max-w-sm space-y-4">
            <MetricBar label="Claridad" value={report.scoreClarity} />
            <MetricBar label="Conocimiento" value={report.scoreKnowledge} />
            <MetricBar label="Confianza" value={report.scoreConfidence} />
            <MetricBar label="Estructura" value={report.scoreStructure} />
          </div>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          <div className="glass-panel rounded-2xl p-6">
            <div className="mb-4 flex items-center gap-2 text-primary">
              <IconThumbUp className="size-5" />
              <h2 className="font-[family-name:var(--font-heading)] font-semibold">
                Fortalezas
              </h2>
            </div>
            <ul className="space-y-2">
              {report.strengths.map((item) => (
                <li
                  key={item}
                  className="text-sm text-muted-foreground before:mr-2 before:text-primary before:content-['•']"
                >
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="glass-panel rounded-2xl p-6">
            <div className="mb-4 flex items-center gap-2 text-destructive">
              <IconThumbDown className="size-5" />
              <h2 className="font-[family-name:var(--font-heading)] font-semibold">
                Áreas de mejora
              </h2>
            </div>
            <ul className="space-y-2">
              {report.weaknesses.map((item) => (
                <li
                  key={item}
                  className="text-sm text-muted-foreground before:mr-2 before:text-destructive before:content-['•']"
                >
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="glass-panel rounded-2xl p-6">
          <div className="mb-3 flex items-center gap-2">
            <IconChartBar className="size-5 text-secondary" />
            <h2 className="font-[family-name:var(--font-heading)] font-semibold">
              Recomendación
            </h2>
          </div>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {report.recommendation}
          </p>
        </div>

        <div className="glass-panel rounded-2xl p-6">
          <div className="mb-3 flex items-center gap-2">
            <IconMessages className="size-5 text-secondary" />
            <h2 className="font-[family-name:var(--font-heading)] font-semibold">
              Transcripción y feedback por respuesta
            </h2>
          </div>
          <div className="mb-4">
            <InterviewRecordingPlayer
              sessionId={sessionId}
              audioRef={audioRef}
              onAvailabilityChange={setAudioAvailable}
            />
          </div>
          {(report.transcript ?? []).length > 0 ? (
            <div className="space-y-2">
              {report.transcript.map((item) => (
                <TranscriptEntry
                  key={item.order}
                  item={item}
                  onSeek={audioAvailable ? seekTo : undefined}
                />
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              La transcripción todavía no está disponible para esta entrevista.
            </p>
          )}
        </div>

        <InterviewReportActions sessionId={sessionId} />

        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button render={<Link href="/interview/setup" />}>
            Nueva entrevista
          </Button>
          <Button variant="outline" render={<Link href="/" />}>
            <IconArrowLeft className="size-4" data-icon="inline-start" />
            Volver al inicio
          </Button>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
