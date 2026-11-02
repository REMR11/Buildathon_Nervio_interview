import type { Metadata } from "next";
import Link from "next/link";
import { PageShell } from "@/components/support/page-shell";
import { TicketList } from "@/components/support/ticket-ui";
import { requireAdminPage } from "@/lib/auth-server";
import { prisma } from "@/lib/prisma";
import { TICKET_LIST_SELECT } from "@/lib/support/tickets";
import { cn } from "@/lib/utils";
import {
  STATUS_LABELS,
  TICKET_STATUSES,
  type TicketStatus,
} from "@/lib/validations/support";

export const metadata: Metadata = { title: "Tickets · Admin · Nervio" };
export const dynamic = "force-dynamic";

export default async function AdminSupportPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  await requireAdminPage("/admin/support");
  const { status: raw } = await searchParams;
  const status = TICKET_STATUSES.includes(raw as TicketStatus)
    ? (raw as TicketStatus)
    : undefined;
  const [tickets, counts] = await Promise.all([
    prisma.supportTicket.findMany({
      where: status ? { status } : undefined,
      select: TICKET_LIST_SELECT,
      orderBy: { updatedAt: "desc" },
    }),
    prisma.supportTicket.groupBy({ by: ["status"], _count: { _all: true } }),
  ]);
  const countOf = (s: string) =>
    counts.find((c) => c.status === s)?._count._all ?? 0;
  const filters: { key?: TicketStatus; label: string; n: number }[] = [
    { label: "Todos", n: counts.reduce((a, c) => a + c._count._all, 0) },
    ...TICKET_STATUSES.map((s) => ({
      key: s,
      label: STATUS_LABELS[s],
      n: countOf(s),
    })),
  ];

  return (
    <PageShell>
      <Link href="/admin" className="text-sm text-primary hover:underline">
        ← Panel de administración
      </Link>
      <h1 className="mt-4 font-[family-name:var(--font-heading)] text-3xl font-bold">
        Tickets de soporte
      </h1>
      <nav className="mt-6 mb-6 flex flex-wrap gap-2">
        {filters.map((f) => (
          <Link
            key={f.label}
            href={f.key ? `/admin/support?status=${f.key}` : "/admin/support"}
            className={cn(
              "rounded-full border px-3 py-1 text-xs",
              f.key === status
                ? "border-primary bg-primary/15 text-primary"
                : "border-border text-muted-foreground hover:text-primary",
            )}
          >
            {f.label} ({f.n})
          </Link>
        ))}
      </nav>
      <TicketList
        tickets={tickets}
        hrefBase="/admin/support"
        showUser
        empty="No hay tickets con este filtro."
      />
    </PageShell>
  );
}
