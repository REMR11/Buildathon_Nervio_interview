import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/require-role";
import { serverError, TICKET_LIST_SELECT } from "@/lib/support/tickets";
import { TICKET_STATUSES, type TicketStatus } from "@/lib/validations/support";

// Todos los tickets (solo admin). Filtro opcional ?status=open|in_progress|closed
export async function GET(request: Request) {
  const check = await requireRole("admin");
  if (!check.ok) return check.response;
  const status = new URL(request.url).searchParams.get("status");
  if (status && !TICKET_STATUSES.includes(status as TicketStatus)) {
    return NextResponse.json({ error: "Estado inválido" }, { status: 400 });
  }
  try {
    const tickets = await prisma.supportTicket.findMany({
      where: status ? { status } : undefined,
      select: TICKET_LIST_SELECT,
      orderBy: [{ updatedAt: "desc" }],
    });
    return NextResponse.json({ tickets });
  } catch (error) {
    return serverError("GET /api/admin/support", error);
  }
}
