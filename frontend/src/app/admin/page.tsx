import type { Metadata } from "next";
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
      createdAt: true,
      _count: { select: { interviewSessions: true } },
    },
  });

  return (
    <main className="relative z-10 mx-auto w-full max-w-5xl px-6 py-12">
      <h1 className="font-[family-name:var(--font-heading)] text-3xl font-bold">
        Panel de administración
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Sesión de {session.user.email} · {users.length} usuarios registrados
      </p>
      <div className="glass-panel mt-8 overflow-x-auto rounded-2xl">
        <table className="w-full text-left text-sm">
          <thead className="text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Nombre</th>
              <th className="px-4 py-3">Correo</th>
              <th className="px-4 py-3">Rol</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3">Entrevistas</th>
              <th className="px-4 py-3">Alta</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-t border-border/40">
                <td className="px-4 py-3">{u.name}</td>
                <td className="px-4 py-3">{u.email}</td>
                <td className="px-4 py-3">{u.role}</td>
                <td className="px-4 py-3">
                  {u.banned ? "Bloqueado" : "Activo"}
                </td>
                <td className="px-4 py-3">{u._count.interviewSessions}</td>
                <td className="px-4 py-3">
                  {u.createdAt.toLocaleDateString("es-SV", {
                    timeZone: "America/El_Salvador",
                  })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
