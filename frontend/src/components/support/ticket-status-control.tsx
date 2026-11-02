"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Select } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import {
  PRIORITY_LABELS,
  STATUS_LABELS,
  TICKET_PRIORITIES,
  TICKET_STATUSES,
} from "@/lib/validations/support";

type Feedback = { kind: "success" | "error"; text: string } | null;

export function TicketStatusControl({
  ticketId,
  status,
  priority,
}: {
  ticketId: string;
  status: string;
  priority: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);

  const update = async (patch: { status?: string; priority?: string }) => {
    setBusy(true);
    setFeedback(null);
    try {
      const res = await fetch(`/api/admin/support/${ticketId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setFeedback({
          kind: "error",
          text: data.error ?? "No se pudo actualizar",
        });
      } else {
        setFeedback({ kind: "success", text: "Ticket actualizado." });
        router.refresh();
      }
    } catch {
      setFeedback({ kind: "error", text: "Error de red. Intenta de nuevo." });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="glass-panel flex flex-wrap items-end gap-4 rounded-2xl p-5">
      <div className="flex flex-col gap-1 text-xs text-muted-foreground">
        <label htmlFor="ticket-status">Estado</label>
        <Select
          id="ticket-status"
          value={status}
          disabled={busy}
          onChange={(e) => update({ status: e.target.value })}
        >
          {TICKET_STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS[s]}
            </option>
          ))}
        </Select>
      </div>
      <div className="flex flex-col gap-1 text-xs text-muted-foreground">
        <label htmlFor="ticket-priority">Prioridad</label>
        <Select
          id="ticket-priority"
          value={priority}
          disabled={busy}
          onChange={(e) => update({ priority: e.target.value })}
        >
          {TICKET_PRIORITIES.map((p) => (
            <option key={p} value={p}>
              {PRIORITY_LABELS[p]}
            </option>
          ))}
        </Select>
      </div>
      {busy && <Spinner />}
      {feedback &&
        (feedback.kind === "error" ? (
          <p role="alert" className="text-sm text-destructive">
            {feedback.text}
          </p>
        ) : (
          <output className="text-sm text-emerald-400">{feedback.text}</output>
        ))}
    </div>
  );
}
