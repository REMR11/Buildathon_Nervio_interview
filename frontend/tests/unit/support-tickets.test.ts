import { describe, expect, it } from "vitest";
import { isUuid, parseJson } from "@/lib/support/tickets";
import { replySchema } from "@/lib/validations/support";

describe("isUuid", () => {
  it("acepta UUID v4 típicos", () => {
    expect(isUuid("11111111-1111-4111-8111-111111111111")).toBe(true);
  });

  it("rechaza valores que no son UUID", () => {
    expect(isUuid("no-uuid")).toBe(false);
    expect(isUuid("11111111-1111-4111-8111-11111111111")).toBe(false);
  });
});

describe("parseJson", () => {
  it("responde 400 ante JSON inválido", async () => {
    const result = await parseJson(
      new Request("http://localhost/api/support", {
        method: "POST",
        body: "no-json",
        headers: { "content-type": "application/json" },
      }),
      replySchema,
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.response.status).toBe(400);
    await expect(result.response.json()).resolves.toEqual({
      error: "JSON inválido",
    });
  });

  it("responde 400 ante datos que no pasan Zod", async () => {
    const result = await parseJson(
      new Request("http://localhost/api/support", {
        method: "POST",
        body: JSON.stringify({ body: "" }),
        headers: { "content-type": "application/json" },
      }),
      replySchema,
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.response.status).toBe(400);
    const payload = await result.response.json();
    expect(payload.error).toBeTruthy();
    expect(payload.issues).toBeInstanceOf(Array);
  });

  it("devuelve datos válidos", async () => {
    const result = await parseJson(
      new Request("http://localhost/api/support", {
        method: "POST",
        body: JSON.stringify({ body: "Gracias, lo revisamos." }),
        headers: { "content-type": "application/json" },
      }),
      replySchema,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.body).toBe("Gracias, lo revisamos.");
  });
});
