import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageShell } from "@/components/support/page-shell";
import { ReplyForm } from "@/components/support/reply-form";
import { TicketStatusControl } from "@/components/support/ticket-status-control";
import { StatusBadge, TicketThread } from "@/components/support/ticket-ui";
import { requireAdminPage } from "@/lib/auth-server";
import { findAccessibleTicket } from "@/lib/support/tickets";

export const metadata: Metadata = { title: "Ticket · Admin · Nervio" };
export const dynamic = "force-dynamic";

export default async function AdminTicketPage({
  params,
}: {
  params: Promise<{ ticketId: string }>;
}) {
  const { ticketId } = await params;
  const session = await requireAdminPage(`/admin/support/${ticketId}`);
  const ticket = await findAccessibleTicket(ticketId, session.user);
  if (!ticket) notFound();

  return (
    <PageShell>
      <Link
        href="/admin/support"
        className="text-sm text-primary hover:underline"
      >
        ← Tickets de soporte
      </Link>
      <div className="mt-4 mb-2 flex flex-wrap items-center gap-3">
        <h1 className="font-[family-name:var(--font-heading)] text-2xl font-bold">
          {ticket.subject}
        </h1>
        <StatusBadge status={ticket.status} />
      </div>
      <p className="mb-6 text-sm text-muted-foreground">
        {ticket.user.name} · {ticket.user.email}
      </p>
      <TicketStatusControl
        ticketId={ticket.id}
        status={ticket.status}
        priority={ticket.priority}
      />
      <div className="mt-6">
        <TicketThread ticket={ticket} />
      </div>
      <div className="mt-6">
        <ReplyForm ticketId={ticket.id} closed={ticket.status === "closed"} />
      </div>
    </PageShell>
  );
}
