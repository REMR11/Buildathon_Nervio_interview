"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { authClient } from "@/lib/auth-client";

export interface AdminUserRow {
  id: string;
  name: string;
  email: string;
  role: string;
  banned: boolean;
  banReason: string | null;
  interviews: number;
  createdAt: string;
}

type Feedback = { kind: "success" | "error"; text: string } | null;

export function AdminUsersTable({
  users,
  currentUserId,
}: {
  users: AdminUserRow[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Feedback>(null);

  const run = async (
    key: string,
    action: () => Promise<{ error: { message?: string } | null }>,
    ok: string,
  ) => {
    setBusy(key);
    setFeedback(null);
    try {
      const { error } = await action();
      if (error) {
        setFeedback({
          kind: "error",
          text: error.message ?? "La acción falló",
        });
      } else {
        setFeedback({ kind: "success", text: ok });
        router.refresh();
      }
    } catch {
      setFeedback({ kind: "error", text: "Error de red. Intenta de nuevo." });
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-4">
      {feedback && (
        <p
          role={feedback.kind === "error" ? "alert" : "status"}
          className={
            feedback.kind === "error"
              ? "rounded-lg bg-destructive/15 px-4 py-2 text-sm text-destructive"
              : "rounded-lg bg-emerald-500/15 px-4 py-2 text-sm text-emerald-400"
          }
        >
          {feedback.text}
        </p>
      )}
      <div className="glass-panel overflow-x-auto rounded-2xl">
        <table className="w-full text-left text-sm">
          <thead className="text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Usuario</th>
              <th className="px-4 py-3">Rol</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3">Entrevistas</th>
              <th className="px-4 py-3">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => {
              const self = u.id === currentUserId;
              const isAdmin = u.role.split(",").includes("admin");
              const nextRole = isAdmin ? "user" : "admin";
              return (
                <tr key={u.id} className="border-t border-border/40 align-top">
                  <td className="px-4 py-3">
                    <div className="font-medium">{u.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {u.email}
                    </div>
                  </td>
                  <td className="px-4 py-3">{u.role}</td>
                  <td className="px-4 py-3">
                    {u.banned ? (
                      <span
                        className="text-destructive"
                        title={u.banReason ?? undefined}
                      >
                        Bloqueado
                      </span>
                    ) : (
                      "Activo"
                    )}
                  </td>
                  <td className="px-4 py-3">{u.interviews}</td>
                  <td className="flex flex-wrap gap-2 px-4 py-3">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={self || busy !== null}
                      onClick={() =>
                        run(
                          `${u.id}:role`,
                          () =>
                            authClient.admin.setRole({
                              userId: u.id,
                              role: nextRole,
                            }),
                          `${u.email} ahora es ${nextRole}.`,
                        )
                      }
                    >
                      {busy === `${u.id}:role` ? (
                        <Spinner data-icon="inline-start" />
                      ) : null}
                      {isAdmin ? "Quitar admin" : "Hacer admin"}
                    </Button>
                    <Button
                      size="sm"
                      variant={u.banned ? "outline" : "destructive"}
                      disabled={self || busy !== null}
                      onClick={() =>
                        run(
                          `${u.id}:ban`,
                          () =>
                            u.banned
                              ? authClient.admin.unbanUser({ userId: u.id })
                              : authClient.admin.banUser({
                                  userId: u.id,
                                  banReason: "Bloqueado por un administrador",
                                }),
                          u.banned
                            ? `${u.email} desbloqueado.`
                            : `${u.email} bloqueado.`,
                        )
                      }
                    >
                      {busy === `${u.id}:ban` ? (
                        <Spinner data-icon="inline-start" />
                      ) : null}
                      {u.banned ? "Desbloquear" : "Bloquear"}
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
