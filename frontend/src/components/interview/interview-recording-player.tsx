"use client";

import { IconClockOff, IconMicrophone } from "@tabler/icons-react";
import type { RefObject } from "react";
import { useEffect, useState } from "react";
import { Spinner } from "@/components/ui/spinner";

export interface RecordingResponse {
  status: "available" | "processing" | "expired" | "unavailable";
  url: string | null;
  source: "storage" | "elevenlabs" | null;
  expiresAt: string | null;
}

interface InterviewRecordingPlayerProps {
  sessionId: string;
  audioRef: RefObject<HTMLAudioElement | null>;
  onAvailabilityChange?: (available: boolean) => void;
}

function formatDate(iso: string | null) {
  if (!iso) return null;
  return new Intl.DateTimeFormat("es", { dateStyle: "medium" }).format(
    new Date(iso),
  );
}

export function InterviewRecordingPlayer({
  sessionId,
  audioRef,
  onAvailabilityChange,
}: InterviewRecordingPlayerProps) {
  const [recording, setRecording] = useState<RecordingResponse | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/interview/${sessionId}/recording`, { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) throw new Error(String(res.status));
        return (await res.json()) as RecordingResponse;
      })
      .then((data) => {
        if (!cancelled) setRecording(data);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  const available = recording?.status === "available" && Boolean(recording.url);
  useEffect(() => {
    onAvailabilityChange?.(available);
  }, [available, onAvailabilityChange]);

  if (!recording && !failed) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Spinner className="size-4" /> Cargando grabación…
      </div>
    );
  }

  if (recording?.status === "expired") {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <IconClockOff className="size-4" />
        Grabación expirada. Las grabaciones se conservan 14 días; la
        transcripción y el feedback siguen disponibles.
      </div>
    );
  }

  if (!available || !recording?.url) {
    return (
      <p className="text-sm text-muted-foreground">
        {recording?.status === "processing"
          ? "La grabación se está procesando. Vuelve a abrir el reporte en unos minutos."
          : "No hay grabación disponible para esta entrevista."}
      </p>
    );
  }

  const until = formatDate(recording.expiresAt);
  return (
    <div className="space-y-2">
      {/* biome-ignore lint/a11y/useMediaCaption: grabación de voz; la transcripción completa está debajo. */}
      <audio
        ref={audioRef}
        controls
        preload="metadata"
        src={recording.url}
        className="w-full"
      />
      <p className="flex items-center gap-1 text-xs text-muted-foreground">
        <IconMicrophone className="size-3.5" />
        Toca la hora de una pregunta para saltar a ese momento.
        {until ? ` Disponible hasta el ${until}.` : ""}
      </p>
    </div>
  );
}
