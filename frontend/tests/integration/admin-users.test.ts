import { beforeEach, describe, expect, it } from "vitest";
import { GET } from "@/app/api/admin/users/route";
import { createTestUser, readJson, signInAs } from "../setup/auth";
import { resetDatabase } from "../setup/db";

describe("GET /api/admin/users", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it("responde 401 sin sesión", async () => {
    expect((await GET()).status).toBe(401);
  });

  it("responde 403 a un usuario sin rol admin", async () => {
    const user = await createTestUser();
    await signInAs(user);
    expect((await GET()).status).toBe(403);
  });

  it("lista usuarios para un admin", async () => {
    await createTestUser({ prefix: "member" });
    const admin = await createTestUser({ role: "admin", prefix: "admin" });
    await signInAs(admin);
    const response = await GET();
    expect(response.status).toBe(200);
    const body = await readJson<{ users: { email: string; role: string }[] }>(
      response,
    );
    expect(body.users.length).toBeGreaterThanOrEqual(2);
    expect(body.users.some((item) => item.role === "admin")).toBe(true);
  });
});
