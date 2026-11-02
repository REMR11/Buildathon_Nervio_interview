"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useEventStream } from "@/lib/realtime/use-event-stream";
import { STATUS_LABELS } from "@/lib/validations/support";

interface ReplyEvent {
  author: { id: string; name: string };
  isStaff: boolean;
}
interface TicketEvent {
  status: keyof typeof STATUS_LABELS;
}

/**
 * Escucha en tiempo real el ticket (nuevas respuestas y cambios de estado) y
 * refresca el hilo renderizado en el servidor. Se usa en la vista de usuario y
 * en la de admin.
 */
export function LiveTicketUpdates({
  ticketId,
  currentUserId,
}: {
  ticketId: string;
  currentUserId: string;
}) {
  const router = useRouter();
  const [notice, setNotice] = useState<string | null>(null);

  const state = useEventStream(`/api/realtime/support/${ticketId}`, {
    reply: (data) => {
      const reply = data as ReplyEvent;
      if (reply.author?.id !== currentUserId) {
        setNotice(
          `Nueva respuesta de ${reply.isStaff ? "soporte" : reply.author?.name}`,
        );
      }
      router.refresh();
    },
    ticket: (data) => {
      const { status } = data as TicketEvent;
      setNotice(`Estado actualizado: ${STATUS_LABELS[status] ?? status}`);
      router.refresh();
    },
  });

  return (
    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
      <span className="inline-flex items-center gap-1.5">
        <span
          aria-hidden
          className={`size-2 rounded-full ${state === "open" ? "bg-emerald-400" : "bg-amber-400"}`}
        />
        {state === "open" ? "En vivo" : "Conectando…"}
      </span>
      {notice && (
        <output className="rounded-md bg-primary/15 px-2 py-1 text-primary">
          {notice}
        </output>
      )}
    </div>
  );
}
