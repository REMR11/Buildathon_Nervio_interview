import type { Metadata } from "next";
import Link from "next/link";
import { PageShell } from "@/components/support/page-shell";
import { TicketList } from "@/components/support/ticket-ui";
import { Button } from "@/components/ui/button";
import { requireAuth } from "@/lib/auth-server";
import { prisma } from "@/lib/prisma";
import { TICKET_LIST_SELECT } from "@/lib/support/tickets";

export const metadata: Metadata = { title: "Soporte · Nervio" };
export const dynamic = "force-dynamic";

export default async function SupportPage() {
  const session = await requireAuth("/support");
  const tickets = await prisma.supportTicket.findMany({
    where: { userId: session.user.id },
    select: TICKET_LIST_SELECT,
    orderBy: { updatedAt: "desc" },
  });
  return (
    <PageShell>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-[family-name:var(--font-heading)] text-3xl font-bold">
            Soporte
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Tus tickets y las respuestas del equipo de Nervio.
          </p>
        </div>
        <Button render={<Link href="/support/new" />}>Nuevo ticket</Button>
      </div>
      <TicketList
        tickets={tickets}
        hrefBase="/support"
        empty="Aún no has abierto tickets. Si algo falla, cuéntanos."
      />
    </PageShell>
  );
}
