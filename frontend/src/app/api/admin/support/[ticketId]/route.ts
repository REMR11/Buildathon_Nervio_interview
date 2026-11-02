import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/require-role";
import {
  isUuid,
  notFound,
  parseJson,
  serverError,
  TICKET_LIST_SELECT,
} from "@/lib/support/tickets";
import { updateTicketSchema } from "@/lib/validations/support";

interface RouteContext {
  params: Promise<{ ticketId: string }>;
}

// Cambiar estado/prioridad (solo admin).
export async function PATCH(request: Request, { params }: RouteContext) {
  const check = await requireRole("admin");
  if (!check.ok) return check.response;
  const parsed = await parseJson(request, updateTicketSchema);
  if (!parsed.ok) return parsed.response;
  try {
    const { ticketId } = await params;
    if (!isUuid(ticketId)) return notFound();
    const exists = await prisma.supportTicket.findUnique({
      where: { id: ticketId },
      select: { id: true },
    });
    if (!exists) return notFound();
    const { status, priority } = parsed.data;
    const ticket = await prisma.supportTicket.update({
      where: { id: ticketId },
      data: {
        ...(status
          ? { status, closedAt: status === "closed" ? new Date() : null }
          : {}),
        ...(priority ? { priority } : {}),
      },
      select: TICKET_LIST_SELECT,
    });
    return NextResponse.json({ ticket });
  } catch (error) {
    return serverError("PATCH /api/admin/support/[id]", error);
  }
}
