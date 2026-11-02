import { NextResponse } from "next/server";
import type { z } from "zod";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/require-role";

export const TICKET_LIST_SELECT = {
  id: true,
  subject: true,
  status: true,
  priority: true,
  createdAt: true,
  updatedAt: true,
  closedAt: true,
  user: { select: { id: true, name: true, email: true } },
  _count: { select: { replies: true } },
} as const;

export const TICKET_DETAIL_INCLUDE = {
  user: { select: { id: true, name: true, email: true } },
  replies: {
    orderBy: { createdAt: "asc" },
    include: { author: { select: { id: true, name: true } } },
  },
} as const;

export function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value,
  );
}

/**
 * Carga un ticket si el usuario es el dueño o admin. Devuelve null en otro
 * caso (se responde 404 para no revelar la existencia de tickets ajenos).
 */
export async function findAccessibleTicket(
  ticketId: string,
  user: { id: string; role?: string | null },
) {
  if (!isUuid(ticketId)) return null;
  const ticket = await prisma.supportTicket.findUnique({
    where: { id: ticketId },
    include: TICKET_DETAIL_INCLUDE,
  });
  if (!ticket) return null;
  if (ticket.userId !== user.id && !isAdmin(user.role)) return null;
  return ticket;
}

export const notFound = () =>
  NextResponse.json({ error: "Ticket no encontrado" }, { status: 404 });

export async function parseJson<T extends z.ZodType>(
  request: Request,
  schema: T,
): Promise<
  { ok: true; data: z.infer<T> } | { ok: false; response: NextResponse }
> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return {
      ok: false,
      response: NextResponse.json({ error: "JSON inválido" }, { status: 400 }),
    };
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          error: parsed.error.issues[0]?.message ?? "Datos inválidos",
          issues: parsed.error.issues.map((i) => ({
            path: i.path.join("."),
            message: i.message,
          })),
        },
        { status: 400 },
      ),
    };
  }
  return { ok: true, data: parsed.data };
}

export const serverError = (scope: string, error: unknown) => {
  console.error(`[support] ${scope}`, error);
  return NextResponse.json(
    { error: "Error interno al procesar el ticket" },
    { status: 500 },
  );
};
