import { beforeEach, describe, expect, it } from "vitest";
import { GET as GET_RECORDINGS } from "@/app/api/cron/recordings-cleanup/route";
import { GET as GET_REMINDERS } from "@/app/api/cron/reminders/route";
import { readJson } from "../setup/auth";
import { resetDatabase } from "../setup/db";

describe("cron protegido por Bearer", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it("responde 401 sin secret", async () => {
    const response = await GET_REMINDERS(
      new Request("http://localhost/api/cron/reminders"),
    );
    expect(response.status).toBe(401);
  });

  it("responde 401 con un Bearer incorrecto", async () => {
    const response = await GET_REMINDERS(
      new Request("http://localhost/api/cron/reminders", {
        headers: { authorization: "Bearer wrong" },
      }),
    );
    expect(response.status).toBe(401);
  });

  it("responde 200 y sent=0 con el secret de prueba", async () => {
    const response = await GET_REMINDERS(
      new Request("http://localhost/api/cron/reminders", {
        headers: { authorization: "Bearer test-cron-secret" },
      }),
    );
    expect(response.status).toBe(200);
    const body = await readJson<{ sent: number }>(response);
    expect(body.sent).toBe(0);
  });

  it("protege el cleanup de grabaciones", async () => {
    const unauthorized = await GET_RECORDINGS(
      new Request("http://localhost/api/cron/recordings-cleanup"),
    );
    expect(unauthorized.status).toBe(401);
    const ok = await GET_RECORDINGS(
      new Request("http://localhost/api/cron/recordings-cleanup", {
        headers: { authorization: "Bearer test-cron-secret" },
      }),
    );
    expect(ok.status).toBe(200);
  });
});
