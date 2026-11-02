import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdmin, requireRole } from "@/lib/require-role";
import {
  findAccessibleTicket,
  notFound,
  parseJson,
  serverError,
} from "@/lib/support/tickets";
import { replySchema } from "@/lib/validations/support";

interface RouteContext {
  params: Promise<{ ticketId: string }>;
}

// Responder en el hilo (dueño o admin). Si responde soporte en un ticket
// abierto, pasa a "in_progress". Un ticket cerrado no admite respuestas.
export async function POST(request: Request, { params }: RouteContext) {
  const check = await requireRole("user");
  if (!check.ok) return check.response;
  const parsed = await parseJson(request, replySchema);
  if (!parsed.ok) return parsed.response;
  try {
    const { ticketId } = await params;
    const user = check.session.user;
    const ticket = await findAccessibleTicket(ticketId, user);
    if (!ticket) return notFound();
    if (ticket.status === "closed") {
      return NextResponse.json(
        { error: "El ticket está cerrado; reábrelo para responder" },
        { status: 409 },
      );
    }
    const isStaff = isAdmin(user.role) && ticket.userId !== user.id;
    const [reply] = await prisma.$transaction([
      prisma.supportReply.create({
        data: {
          ticketId: ticket.id,
          authorId: user.id,
          body: parsed.data.body,
          isStaff,
        },
        include: { author: { select: { id: true, name: true } } },
      }),
      prisma.supportTicket.update({
        where: { id: ticket.id },
        data: {
          updatedAt: new Date(),
          ...(isStaff && ticket.status === "open"
            ? { status: "in_progress" }
            : {}),
        },
      }),
    ]);
    return NextResponse.json({ reply }, { status: 201 });
  } catch (error) {
    return serverError("POST /api/support/[id]/replies", error);
  }
}
