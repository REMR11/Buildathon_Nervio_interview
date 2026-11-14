import { beforeEach, describe, expect, it } from "vitest";
import { GET as GET_INTERVIEW } from "@/app/api/realtime/interview/[sessionId]/route";
import { GET as GET_SUPPORT } from "@/app/api/realtime/support/[ticketId]/route";
import { prisma } from "@/lib/prisma";
import { createTestUser, routeParams, signInAs } from "../setup/auth";
import { resetDatabase } from "../setup/db";

async function readSsePrefix(response: Response, abort: AbortController) {
  const reader = response.body?.getReader();
  if (!reader) return "";
  const { value } = await reader.read();
  abort.abort();
  await reader.cancel().catch(() => undefined);
  return value ? new TextDecoder().decode(value) : "";
}

describe("SSE realtime", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it("entrevista: 401 / 404", async () => {
    const unauthorized = await GET_INTERVIEW(
      new Request("http://localhost/api/realtime/interview/x"),
      routeParams({ sessionId: "x" }),
    );
    expect(unauthorized.status).toBe(401);

    const user = await createTestUser();
    await signInAs(user);
    const missing = await GET_INTERVIEW(
      new Request(
        "http://localhost/api/realtime/interview/11111111-1111-4111-8111-111111111111",
      ),
      routeParams({ sessionId: "11111111-1111-4111-8111-111111111111" }),
    );
    expect(missing.status).toBe(404);
  });

  it("entrevista: stream report.pending y cierra", async () => {
    const user = await createTestUser();
    await signInAs(user);
    const session = await prisma.interviewSession.create({
      data: {
        userId: user.id,
        interviewType: "hr",
        role: "QA",
        level: "junior",
        extraContext: "SSE ficticio",
        status: "in_progress",
      },
    });
    const abort = new AbortController();
    const response = await GET_INTERVIEW(
      new Request(`http://localhost/api/realtime/interview/${session.id}`, {
        signal: abort.signal,
      }),
      routeParams({ sessionId: session.id }),
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toMatch(/text\/event-stream/);
    const prefix = await readSsePrefix(response, abort);
    expect(prefix).toContain("retry:");
  });

  it("soporte: 404 para un ticket ajeno y 200 para el dueño", async () => {
    const owner = await createTestUser({ prefix: "owner" });
    const ticket = await prisma.supportTicket.create({
      data: {
        userId: owner.id,
        subject: "Falla ficticia",
        message: "Detalle del ticket de prueba.",
      },
    });
    const other = await createTestUser({ prefix: "other" });
    await signInAs(other);
    const hidden = await GET_SUPPORT(
      new Request(`http://localhost/api/realtime/support/${ticket.id}`),
      routeParams({ ticketId: ticket.id }),
    );
    expect(hidden.status).toBe(404);

    await signInAs(owner);
    const abort = new AbortController();
    const stream = await GET_SUPPORT(
      new Request(`http://localhost/api/realtime/support/${ticket.id}`, {
        signal: abort.signal,
      }),
      routeParams({ ticketId: ticket.id }),
    );
    expect(stream.status).toBe(200);
    await readSsePrefix(stream, abort);
  });
});
