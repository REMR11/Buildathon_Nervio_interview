import { beforeEach, describe, expect, it } from "vitest";
import { GET, PATCH } from "@/app/api/users/me/route";
import { prisma } from "@/lib/prisma";
import { createTestUser, jsonRequest, readJson, signInAs } from "../setup/auth";
import { resetDatabase } from "../setup/db";

describe("GET/PATCH /api/users/me", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it("responde 401 sin sesión", async () => {
    const response = await GET();
    expect(response.status).toBe(401);
  });

  it("devuelve el perfil autenticado", async () => {
    const user = await createTestUser({ name: "Candidato Prueba" });
    await signInAs(user);
    const response = await GET();
    expect(response.status).toBe(200);
    const body = await readJson(response);
    expect(body.user).toMatchObject({
      email: user.email,
      name: "Candidato Prueba",
      role: "user",
      stats: { interviews: 0, schedules: 0 },
    });
  });

  it("responde 403 si la cuenta se banea con la sesión ya abierta", async () => {
    const user = await createTestUser();
    await signInAs(user);
    await prisma.user.update({
      where: { id: user.id },
      data: { banned: true },
    });
    const response = await GET();
    expect(response.status).toBe(403);
  });

  it("rechaza un PATCH con JSON inválido", async () => {
    const user = await createTestUser();
    await signInAs(user);
    const response = await PATCH(
      new Request("http://localhost/api/users/me", {
        method: "PATCH",
        body: "no-json",
      }),
    );
    expect(response.status).toBe(400);
  });

  it("rechaza un PATCH vacío", async () => {
    const user = await createTestUser();
    await signInAs(user);
    const response = await PATCH(
      jsonRequest("http://localhost/api/users/me", {}, { method: "PATCH" }),
    );
    expect(response.status).toBe(400);
  });

  it("actualiza el nombre", async () => {
    const user = await createTestUser();
    await signInAs(user);
    const response = await PATCH(
      jsonRequest(
        "http://localhost/api/users/me",
        { name: "Nombre Nuevo" },
        { method: "PATCH" },
      ),
    );
    expect(response.status).toBe(200);
    const body = await readJson<{ user: { name: string } }>(response);
    expect(body.user.name).toBe("Nombre Nuevo");
  });
});
