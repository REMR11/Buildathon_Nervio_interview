import type { Metadata } from "next";
import Link from "next/link";
import { AdminUsersTable } from "@/components/admin/admin-users-table";
import { AuthBackground } from "@/components/layout/auth-background";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { requireAdminPage } from "@/lib/auth-server";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Administración · Nervio" };
export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const session = await requireAdminPage("/admin");
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      banned: true,
      banReason: true,
      createdAt: true,
      _count: { select: { interviewSessions: true } },
    },
  });

  return (
    <>
      <AuthBackground />
      <SiteHeader />
      <main className="relative z-10 mx-auto w-full max-w-5xl px-6 pt-32 pb-16">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-[family-name:var(--font-heading)] text-3xl font-bold">
              Panel de administración
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Sesión de {session.user.email} · {users.length} usuarios
              registrados
            </p>
          </div>
          <Link
            href="/admin/support"
            className="text-sm text-primary hover:underline"
          >
            Tickets de soporte →
          </Link>
        </div>
        <div className="mt-8">
          <AdminUsersTable
            currentUserId={session.user.id}
            users={users.map(({ _count, createdAt, banned, ...u }) => ({
              ...u,
              banned: Boolean(banned),
              interviews: _count.interviewSessions,
              createdAt: createdAt.toISOString(),
            }))}
          />
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
