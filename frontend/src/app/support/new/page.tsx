import type { Metadata } from "next";
import Link from "next/link";
import { NewTicketForm } from "@/components/support/new-ticket-form";
import { PageShell } from "@/components/support/page-shell";
import { requireAuth } from "@/lib/auth-server";

export const metadata: Metadata = { title: "Nuevo ticket · Nervio" };

export default async function NewTicketPage() {
  await requireAuth("/support/new");
  return (
    <PageShell>
      <Link href="/support" className="text-sm text-primary hover:underline">
        ← Volver a soporte
      </Link>
      <h1 className="mt-4 font-[family-name:var(--font-heading)] text-3xl font-bold">
        Nuevo ticket
      </h1>
      <div className="glass-panel mt-8 rounded-2xl p-8">
        <NewTicketForm />
      </div>
    </PageShell>
  );
}
