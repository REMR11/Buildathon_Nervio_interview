import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { type SseEvent, sseResponse } from "@/lib/realtime/sse";
import { findAccessibleTicket } from "@/lib/support/tickets";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

interface RouteContext {
  params: Promise<{ ticketId: string }>;
}

/**
 * GET /api/realtime/support/[ticketId] — SSE con eventos del ticket:
 * - `reply`: nueva respuesta en el hilo.
 * - `ticket`: cambio de estado o prioridad.
 * Solo el dueño del ticket o un admin pueden suscribirse (404 en otro caso).
 */
export async function GET(request: Request, { params }: RouteContext) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const { ticketId } = await params;
  const ticket = await findAccessibleTicket(ticketId, session.user);
  if (!ticket) {
    return NextResponse.json(
      { error: "Ticket no encontrado" },
      { status: 404 },
    );
  }

  // Cursor: Last-Event-ID (reconexión) o la última respuesta conocida.
  const lastEventId = request.headers.get("last-event-id");
  const lastReply = ticket.replies.at(-1);
  let cursor =
    lastEventId && !Number.isNaN(Date.parse(lastEventId))
      ? new Date(lastEventId)
      : (lastReply?.createdAt ?? ticket.createdAt);
  let state = { status: ticket.status, priority: ticket.priority };

  return sseResponse({
    signal: request.signal,
    tick: async () => {
      const events: SseEvent[] = [];
      const current = await prisma.supportTicket.findUnique({
        where: { id: ticket.id },
        select: {
          status: true,
          priority: true,
          closedAt: true,
          updatedAt: true,
          replies: {
            where: { createdAt: { gt: cursor } },
            orderBy: { createdAt: "asc" },
            select: {
              id: true,
              body: true,
              isStaff: true,
              createdAt: true,
              author: { select: { id: true, name: true } },
            },
          },
        },
      });
      if (!current) {
        return {
          events: [{ event: "deleted", data: { ticketId } }],
          done: true,
        };
      }
      for (const reply of current.replies) {
        cursor = reply.createdAt;
        events.push({
          event: "reply",
          id: reply.createdAt.toISOString(),
          data: { ticketId, ...reply },
        });
      }
      if (
        current.status !== state.status ||
        current.priority !== state.priority
      ) {
        state = { status: current.status, priority: current.priority };
        events.push({
          event: "ticket",
          data: {
            ticketId,
            ...state,
            closedAt: current.closedAt,
            updatedAt: current.updatedAt,
          },
        });
      }
      return { events };
    },
  });
}
