import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { LiveTicketUpdates } from "@/components/realtime/live-ticket-updates";
import { PageShell } from "@/components/support/page-shell";
import { ReplyForm } from "@/components/support/reply-form";
import {
  PriorityLabel,
  StatusBadge,
  TicketThread,
} from "@/components/support/ticket-ui";
import { requireAuth } from "@/lib/auth-server";
import { findAccessibleTicket } from "@/lib/support/tickets";

export const metadata: Metadata = { title: "Ticket · Nervio" };
export const dynamic = "force-dynamic";

export default async function TicketPage({
  params,
  searchParams,
}: {
  params: Promise<{ ticketId: string }>;
  searchParams: Promise<{ created?: string }>;
}) {
  const { ticketId } = await params;
  const { created } = await searchParams;
  const session = await requireAuth(`/support/${ticketId}`);
  const ticket = await findAccessibleTicket(ticketId, session.user);
  if (!ticket) notFound();

  return (
    <PageShell>
      <Link href="/support" className="text-sm text-primary hover:underline">
        ← Volver a soporte
      </Link>
      {created && (
        <output className="mt-4 block rounded-lg bg-emerald-500/15 px-4 py-2 text-sm text-emerald-400">
          Ticket creado. Te responderemos aquí.
        </output>
      )}
      <div className="mt-4 mb-6 flex flex-wrap items-center gap-3">
        <h1 className="font-[family-name:var(--font-heading)] text-2xl font-bold">
          {ticket.subject}
        </h1>
        <StatusBadge status={ticket.status} />
        <PriorityLabel priority={ticket.priority} />
      </div>
      <div className="mb-4">
        <LiveTicketUpdates
          ticketId={ticket.id}
          currentUserId={session.user.id}
        />
      </div>
      <TicketThread ticket={ticket} />
      <div className="mt-6">
        <ReplyForm ticketId={ticket.id} closed={ticket.status === "closed"} />
      </div>
    </PageShell>
  );
}
