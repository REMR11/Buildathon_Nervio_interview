"use client";

import Link from "next/link";
import { useState } from "react";
import { Spinner } from "@/components/ui/spinner";
import { useEventStream } from "@/lib/realtime/use-event-stream";

/**
 * Aviso en tiempo real de "reporte listo" para una entrevista terminada.
 * Reemplaza la espera a ciegas: el servidor reintenta el análisis y empuja el
 * evento `report.ready` en cuanto la evaluación existe.
 */
export function ReportReadyNotice({
  sessionId,
  onReady,
}: {
  sessionId: string;
  onReady?: () => void;
}) {
  const [ready, setReady] = useState(false);
  useEventStream(ready ? null : `/api/realtime/interview/${sessionId}`, {
    "report.ready": () => {
      setReady(true);
      onReady?.();
    },
  });

  if (ready) {
    return (
      <output className="flex items-center gap-2 rounded-lg bg-emerald-500/15 px-4 py-2 text-sm text-emerald-400">
        ✓ Tu reporte está listo.{" "}
        <Link href={`/interview/${sessionId}/report`} className="underline">
          Verlo ahora
        </Link>
      </output>
    );
  }
  return (
    <output className="flex items-center gap-2 rounded-lg bg-muted/40 px-4 py-2 text-sm text-muted-foreground">
      <Spinner className="size-4" /> Generando tu reporte… te avisaremos aquí.
    </output>
  );
}
