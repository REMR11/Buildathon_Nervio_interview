import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/require-role";
import {
  parseJson,
  serverError,
  TICKET_LIST_SELECT,
} from "@/lib/support/tickets";
import { createTicketApiSchema } from "@/lib/validations/support";

// Tickets del usuario autenticado.
export async function GET() {
  const check = await requireRole("user");
  if (!check.ok) return check.response;
  try {
    const tickets = await prisma.supportTicket.findMany({
      where: { userId: check.session.user.id },
      select: TICKET_LIST_SELECT,
      orderBy: { updatedAt: "desc" },
    });
    return NextResponse.json({ tickets });
  } catch (error) {
    return serverError("GET /api/support", error);
  }
}

export async function POST(request: Request) {
  const check = await requireRole("user");
  if (!check.ok) return check.response;
  const parsed = await parseJson(request, createTicketApiSchema);
  if (!parsed.ok) return parsed.response;
  try {
    const ticket = await prisma.supportTicket.create({
      data: { ...parsed.data, userId: check.session.user.id },
      select: TICKET_LIST_SELECT,
    });
    return NextResponse.json({ ticket }, { status: 201 });
  } catch (error) {
    return serverError("POST /api/support", error);
  }
}
