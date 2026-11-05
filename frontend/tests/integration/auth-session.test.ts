import { beforeEach, describe, expect, it } from "vitest";
import { GET as GET_ME } from "@/app/api/users/me/route";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  createTestUser,
  readJson,
  signInAs,
  TEST_PASSWORD,
} from "../setup/auth";
import { resetDatabase } from "../setup/db";
import {
  cookieHeaderFromSetCookie,
  setSessionCookie,
} from "../setup/request-context";

describe("sesión Better Auth", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it("sign-up crea el usuario con rol user", async () => {
    const user = await createTestUser();
    const stored = await prisma.user.findUniqueOrThrow({
      where: { id: user.id },
    });
    expect(stored.role).toBe("user");
    expect(stored.banned).toBe(false);
  });

  it("getSession reconoce la cookie emitida por sign-in", async () => {
    const user = await createTestUser();
    const cookie = await signInAs(user);
    expect(cookie).toMatch(/session/);
    const me = await GET_ME();
    expect(me.status).toBe(200);
    const body = await readJson<{ user: { email: string } }>(me);
    expect(body.user.email).toBe(user.email);
  });

  it("rechaza una contraseña incorrecta", async () => {
    const user = await createTestUser();
    await expect(
      auth.api.signInEmail({
        body: { email: user.email, password: "WrongPass#000" },
      }),
    ).rejects.toThrow();
  });

  it("un admin autenticado pasa requireRole admin vía GET /api/admin/users", async () => {
    const { GET } = await import("@/app/api/admin/users/route");
    const admin = await createTestUser({ role: "admin", prefix: "admin" });
    await signInAs(admin);
    expect((await GET()).status).toBe(200);
  });

  it("sin cookie, getSession no autentica aunque exista el usuario", async () => {
    await createTestUser();
    setSessionCookie("");
    const me = await GET_ME();
    expect(me.status).toBe(401);
  });

  it("propaga Set-Cookie a Cookie para el handler", async () => {
    const user = await createTestUser();
    const response = await auth.api.signInEmail({
      body: { email: user.email, password: TEST_PASSWORD },
      asResponse: true,
    });
    const header = cookieHeaderFromSetCookie(
      response.headers.getSetCookie?.() ?? [],
    );
    expect(header.length).toBeGreaterThan(10);
  });
});
