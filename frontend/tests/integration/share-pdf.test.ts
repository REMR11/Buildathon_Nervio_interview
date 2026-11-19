import { beforeEach, describe, expect, it } from "vitest";
import { GET } from "@/app/api/r/[token]/pdf/route";
import { prisma } from "@/lib/prisma";
import { createTestUser, routeParams } from "../setup/auth";
import { resetDatabase } from "../setup/db";

describe("GET /api/r/[token]/pdf", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it("responde 404 si el token es inválido", async () => {
    const response = await GET(
      new Request("http://localhost/api/r/token-corto/pdf"),
      routeParams({ token: "token-corto" }),
    );
    expect(response.status).toBe(404);
  });

  it("responde 404 si el token no existe o está vencido", async () => {
    const user = await createTestUser();
    const session = await prisma.interviewSession.create({
      data: {
        userId: user.id,
        interviewType: "hr",
        role: "QA",
        level: "junior",
        extraContext: "Reporte ficticio",
        status: "ended",
      },
    });
    await prisma.report_shares.create({
      data: {
        sessionId: session.id,
        token: "a".repeat(24),
        expiresAt: new Date(Date.now() - 1000),
      },
    });
    const response = await GET(
      new Request(`http://localhost/api/r/${"a".repeat(24)}/pdf`),
      routeParams({ token: "a".repeat(24) }),
    );
    expect(response.status).toBe(404);
  });
});
