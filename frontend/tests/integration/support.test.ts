import { beforeEach, describe, expect, it } from "vitest";
import { PATCH as PATCH_ADMIN } from "@/app/api/admin/support/[ticketId]/route";
import { GET as GET_ADMIN_LIST } from "@/app/api/admin/support/route";
import { POST as POST_REPLY } from "@/app/api/support/[ticketId]/replies/route";
import { GET as GET_ONE } from "@/app/api/support/[ticketId]/route";
import { GET as GET_LIST, POST as POST_TICKET } from "@/app/api/support/route";
import {
  createTestUser,
  jsonRequest,
  readJson,
  routeParams,
  signInAs,
} from "../setup/auth";
import { resetDatabase } from "../setup/db";

const ticketBody = {
  subject: "No inicia la entrevista",
  message: "Al pulsar iniciar la esfera se queda en silencio.",
  priority: "high",
};

describe("soporte: tickets y roles", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it("GET lista responde 401 sin sesión", async () => {
    expect((await GET_LIST()).status).toBe(401);
  });

  it("POST valida el cuerpo", async () => {
    const user = await createTestUser();
    await signInAs(user);
    const response = await POST_TICKET(
      jsonRequest("http://localhost/api/support", { subject: "x" }),
    );
    expect(response.status).toBe(400);
  });

  it("crea, lista y obtiene el ticket del dueño", async () => {
    const user = await createTestUser();
    await signInAs(user);
    const created = await POST_TICKET(
      jsonRequest("http://localhost/api/support", ticketBody),
    );
    expect(created.status).toBe(201);
    const { ticket } = await readJson<{ ticket: { id: string } }>(created);

    const list = await GET_LIST();
    expect(list.status).toBe(200);
    const listed = await readJson<{ tickets: { id: string }[] }>(list);
    expect(listed.tickets.map((item) => item.id)).toContain(ticket.id);

    const detail = await GET_ONE(
      new Request(`http://localhost/api/support/${ticket.id}`),
      routeParams({ ticketId: ticket.id }),
    );
    expect(detail.status).toBe(200);
  });

  it("oculta tickets ajenos con 404", async () => {
    const owner = await createTestUser({ prefix: "owner" });
    await signInAs(owner);
    const created = await POST_TICKET(
      jsonRequest("http://localhost/api/support", ticketBody),
    );
    const { ticket } = await readJson<{ ticket: { id: string } }>(created);

    const other = await createTestUser({ prefix: "other" });
    await signInAs(other);
    const detail = await GET_ONE(
      new Request(`http://localhost/api/support/${ticket.id}`),
      routeParams({ ticketId: ticket.id }),
    );
    expect(detail.status).toBe(404);
  });

  it("permite al admin ver y cambiar estado; 409 al responder uno cerrado", async () => {
    const owner = await createTestUser({ prefix: "owner" });
    await signInAs(owner);
    const created = await POST_TICKET(
      jsonRequest("http://localhost/api/support", ticketBody),
    );
    const { ticket } = await readJson<{ ticket: { id: string } }>(created);

    const admin = await createTestUser({ role: "admin", prefix: "admin" });
    await signInAs(admin);

    const adminList = await GET_ADMIN_LIST(
      new Request("http://localhost/api/admin/support"),
    );
    expect(adminList.status).toBe(200);

    const badStatus = await GET_ADMIN_LIST(
      new Request("http://localhost/api/admin/support?status=nope"),
    );
    expect(badStatus.status).toBe(400);

    const patched = await PATCH_ADMIN(
      jsonRequest(
        `http://localhost/api/admin/support/${ticket.id}`,
        { status: "closed" },
        { method: "PATCH" },
      ),
      routeParams({ ticketId: ticket.id }),
    );
    expect(patched.status).toBe(200);

    const reply = await POST_REPLY(
      jsonRequest(`http://localhost/api/support/${ticket.id}/replies`, {
        body: "Cerrado, no se puede responder.",
      }),
      routeParams({ ticketId: ticket.id }),
    );
    expect(reply.status).toBe(409);
  });

  it("marca isStaff y pasa a in_progress cuando responde un admin", async () => {
    const owner = await createTestUser({ prefix: "owner" });
    await signInAs(owner);
    const created = await POST_TICKET(
      jsonRequest("http://localhost/api/support", ticketBody),
    );
    const { ticket } = await readJson<{ ticket: { id: string } }>(created);

    const admin = await createTestUser({ role: "admin", prefix: "admin" });
    await signInAs(admin);
    const reply = await POST_REPLY(
      jsonRequest(`http://localhost/api/support/${ticket.id}/replies`, {
        body: "Estamos revisando el caso.",
      }),
      routeParams({ ticketId: ticket.id }),
    );
    expect(reply.status).toBe(201);
    const body = await readJson<{ reply: { isStaff: boolean } }>(reply);
    expect(body.reply.isStaff).toBe(true);

    const detail = await GET_ONE(
      new Request(`http://localhost/api/support/${ticket.id}`),
      routeParams({ ticketId: ticket.id }),
    );
    const ticketDetail = await readJson<{ ticket: { status: string } }>(detail);
    expect(ticketDetail.ticket.status).toBe("in_progress");
  });

  it("GET admin responde 403 a un usuario", async () => {
    const user = await createTestUser();
    await signInAs(user);
    const response = await GET_ADMIN_LIST(
      new Request("http://localhost/api/admin/support"),
    );
    expect(response.status).toBe(403);
  });
});
