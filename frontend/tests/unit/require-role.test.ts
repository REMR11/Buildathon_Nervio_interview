import { beforeEach, describe, expect, it, vi } from "vitest";

const { getSession } = vi.hoisted(() => ({ getSession: vi.fn() }));

vi.mock("next/headers", () => ({
  headers: async () => new Headers(),
}));

vi.mock("@/lib/auth", () => ({
  auth: { api: { getSession } },
}));

import { hasRole, isAdmin, requireRole } from "@/lib/require-role";

describe("hasRole", () => {
  it("trata un rol nulo como user", () => {
    expect(hasRole(null, ["user"])).toBe(true);
    expect(hasRole(undefined, ["admin"])).toBe(false);
  });

  it("acepta varios roles separados por coma", () => {
    expect(hasRole("user,admin", ["admin"])).toBe(true);
    expect(hasRole("user", ["admin"])).toBe(false);
  });

  it("hace que admin herede cualquier permiso", () => {
    expect(hasRole("admin", ["user"])).toBe(true);
    expect(hasRole("admin", ["admin"])).toBe(true);
  });
});

describe("isAdmin", () => {
  it("detecta el rol admin", () => {
    expect(isAdmin("admin")).toBe(true);
    expect(isAdmin("user")).toBe(false);
    expect(isAdmin("user,admin")).toBe(true);
  });
});

describe("requireRole", () => {
  beforeEach(() => {
    getSession.mockReset();
  });

  it("responde 401 si no hay sesión", async () => {
    getSession.mockResolvedValue(null);
    const result = await requireRole("user");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.response.status).toBe(401);
    await expect(result.response.json()).resolves.toEqual({
      error: "No autorizado",
    });
  });

  it("responde 403 si la cuenta está baneada", async () => {
    getSession.mockResolvedValue({
      user: { id: "u1", role: "user", banned: true },
    });
    const result = await requireRole("user");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.response.status).toBe(403);
  });

  it("responde 403 si el rol no alcanza", async () => {
    getSession.mockResolvedValue({
      user: { id: "u1", role: "user", banned: false },
    });
    const result = await requireRole("admin");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.response.status).toBe(403);
  });

  it("acepta a un usuario con rol user", async () => {
    const session = { user: { id: "u1", role: "user", banned: false } };
    getSession.mockResolvedValue(session);
    const result = await requireRole("user");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.session).toBe(session);
  });

  it("acepta a un admin en rutas de usuario", async () => {
    getSession.mockResolvedValue({
      user: { id: "a1", role: "admin", banned: false },
    });
    const result = await requireRole("user");
    expect(result.ok).toBe(true);
  });
});
