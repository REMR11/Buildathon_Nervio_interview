import { NextResponse } from "next/server";
import { requireRole } from "@/lib/require-role";
import {
  findAccessibleTicket,
  notFound,
  serverError,
} from "@/lib/support/tickets";

interface RouteContext {
  params: Promise<{ ticketId: string }>;
}

// Detalle con hilo de respuestas (dueño o admin).
export async function GET(_request: Request, { params }: RouteContext) {
  const check = await requireRole("user");
  if (!check.ok) return check.response;
  try {
    const { ticketId } = await params;
    const ticket = await findAccessibleTicket(ticketId, check.session.user);
    if (!ticket) return notFound();
    return NextResponse.json({ ticket });
  } catch (error) {
    return serverError("GET /api/support/[id]", error);
  }
}
