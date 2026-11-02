import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  PRIORITY_LABELS,
  STATUS_LABELS,
  type TicketPriority,
  type TicketStatus,
} from "@/lib/validations/support";

const STATUS_STYLES: Record<TicketStatus, string> = {
  open: "bg-sky-500/15 text-sky-300",
  in_progress: "bg-amber-500/15 text-amber-300",
  closed: "bg-muted text-muted-foreground",
};
const PRIORITY_STYLES: Record<TicketPriority, string> = {
  low: "text-muted-foreground",
  normal: "text-foreground",
  high: "text-destructive font-semibold",
};

export function StatusBadge({ status }: { status: string }) {
  const s = status as TicketStatus;
  return (
    <span
      className={cn("rounded-full px-2.5 py-0.5 text-xs", STATUS_STYLES[s])}
    >
      {STATUS_LABELS[s] ?? status}
    </span>
  );
}

export function PriorityLabel({ priority }: { priority: string }) {
  const p = priority as TicketPriority;
  return (
    <span className={cn("text-xs", PRIORITY_STYLES[p])}>
      Prioridad {PRIORITY_LABELS[p] ?? priority}
    </span>
  );
}

export function formatDateTime(value: Date) {
  return new Intl.DateTimeFormat("es-SV", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/El_Salvador",
  }).format(value);
}

export interface TicketListItem {
  id: string;
  subject: string;
  status: string;
  priority: string;
  updatedAt: Date;
  user: { name: string; email: string };
  _count: { replies: number };
}

export function TicketList({
  tickets,
  hrefBase,
  showUser = false,
  empty,
}: {
  tickets: TicketListItem[];
  hrefBase: string;
  showUser?: boolean;
  empty: string;
}) {
  if (tickets.length === 0) {
    return (
      <p className="glass-panel rounded-2xl p-8 text-center text-sm text-muted-foreground">
        {empty}
      </p>
    );
  }
  return (
    <ul className="space-y-3">
      {tickets.map((t) => (
        <li key={t.id}>
          <Link
            href={`${hrefBase}/${t.id}`}
            className="glass-panel block rounded-2xl p-5 transition-colors hover:border-primary/50"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-medium">{t.subject}</span>
              <StatusBadge status={t.status} />
            </div>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <PriorityLabel priority={t.priority} />
              <span>{t._count.replies} respuestas</span>
              <span>Actualizado {formatDateTime(t.updatedAt)}</span>
              {showUser && (
                <span>
                  {t.user.name} · {t.user.email}
                </span>
              )}
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export interface TicketDetail {
  subject: string;
  message: string;
  status: string;
  priority: string;
  createdAt: Date;
  userId: string;
  user: { name: string; email: string };
  replies: {
    id: string;
    body: string;
    isStaff: boolean;
    createdAt: Date;
    author: { id: string; name: string };
  }[];
}

export function TicketThread({ ticket }: { ticket: TicketDetail }) {
  return (
    <div className="space-y-4">
      <article className="glass-panel rounded-2xl p-6">
        <div className="text-xs text-muted-foreground">
          {ticket.user.name} · {formatDateTime(ticket.createdAt)}
        </div>
        <p className="mt-3 whitespace-pre-wrap text-sm">{ticket.message}</p>
      </article>
      {ticket.replies.map((r) => (
        <article
          key={r.id}
          className={cn(
            "rounded-2xl p-5",
            r.isStaff
              ? "ml-8 border border-primary/30 bg-primary/10"
              : "glass-panel mr-8",
          )}
        >
          <div className="text-xs text-muted-foreground">
            {r.author.name}
            {r.isStaff ? " · Soporte Nervio" : ""} ·{" "}
            {formatDateTime(r.createdAt)}
          </div>
          <p className="mt-2 whitespace-pre-wrap text-sm">{r.body}</p>
        </article>
      ))}
    </div>
  );
}
