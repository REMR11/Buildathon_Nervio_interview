import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/elevenlabs/token/route";
import { prisma } from "@/lib/prisma";
import { createTestUser, readJson, signInAs } from "../setup/auth";
import { resetDatabase } from "../setup/db";

async function activeSession(userId: string, status = "in_progress") {
  return prisma.interviewSession.create({
    data: {
      userId,
      interviewType: "hr",
      role: "QA",
      level: "junior",
      extraContext: "Sesión ficticia",
      status,
    },
  });
}

describe("GET /api/elevenlabs/token", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it("responde 401 sin sesión", async () => {
    const response = await GET(
      new Request("http://localhost/api/elevenlabs/token"),
    );
    expect(response.status).toBe(401);
  });

  it("responde 400 sin sessionId", async () => {
    const user = await createTestUser();
    await signInAs(user);
    const response = await GET(
      new Request("http://localhost/api/elevenlabs/token"),
    );
    expect(response.status).toBe(400);
  });

  it("responde 404 si la sesión no existe", async () => {
    const user = await createTestUser();
    await signInAs(user);
    const response = await GET(
      new Request(
        "http://localhost/api/elevenlabs/token?sessionId=11111111-1111-4111-8111-111111111111",
      ),
    );
    expect(response.status).toBe(404);
  });

  it("responde 409 si la entrevista ya terminó", async () => {
    const user = await createTestUser();
    await signInAs(user);
    const session = await activeSession(user.id, "ended");
    const response = await GET(
      new Request(
        `http://localhost/api/elevenlabs/token?sessionId=${session.id}`,
      ),
    );
    expect(response.status).toBe(409);
  });

  it("responde 500 si no hay credenciales de ElevenLabs", async () => {
    const user = await createTestUser();
    await signInAs(user);
    const session = await activeSession(user.id);
    const response = await GET(
      new Request(
        `http://localhost/api/elevenlabs/token?sessionId=${session.id}`,
      ),
    );
    expect(response.status).toBe(500);
  });

  it("devuelve 200 con fetch mockeado y 502 si ElevenLabs falla", async () => {
    const user = await createTestUser();
    await signInAs(user);
    const session = await activeSession(user.id);
    vi.stubEnv("ELEVENLABS_API_KEY", "test-key");
    vi.stubEnv("ELEVENLABS_AGENT_ID", "agent-1");

    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(JSON.stringify({ token: "fake-token" }), {
            status: 200,
          }),
      ),
    );
    const ok = await GET(
      new Request(
        `http://localhost/api/elevenlabs/token?sessionId=${session.id}`,
      ),
    );
    expect(ok.status).toBe(200);
    expect((await readJson(ok)).token).toBe("fake-token");

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("nope", { status: 500 })),
    );
    const fail = await GET(
      new Request(
        `http://localhost/api/elevenlabs/token?sessionId=${session.id}`,
      ),
    );
    expect(fail.status).toBe(502);
  });
});
