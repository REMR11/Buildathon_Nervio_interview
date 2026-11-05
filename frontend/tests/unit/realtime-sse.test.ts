import { describe, expect, it } from "vitest";
import { encodeSse, sseResponse } from "@/lib/realtime/sse";

describe("encodeSse", () => {
  it("serializa evento, datos e id", () => {
    expect(encodeSse({ event: "reply", data: { ok: true }, id: "1" })).toBe(
      'id: 1\nevent: reply\ndata: {"ok":true}\n\n',
    );
  });
});

describe("sseResponse", () => {
  it("emite retry, eventos del tick y cierra con done", async () => {
    const controller = new AbortController();
    const response = sseResponse({
      signal: controller.signal,
      intervalMs: 5,
      maxMs: 500,
      heartbeatMs: 10_000,
      retryMs: 1200,
      tick: async () => ({
        events: [{ event: "report.ready", data: { sessionId: "s1" } }],
        done: true,
      }),
    });
    expect(response.headers.get("Content-Type")).toMatch(/text\/event-stream/);
    const body = await response.text();
    expect(body).toContain("retry: 1200");
    expect(body).toContain("event: report.ready");
    expect(body).toContain('"sessionId":"s1"');
  });

  it("emite error si el tick lanza", async () => {
    const controller = new AbortController();
    const response = sseResponse({
      signal: controller.signal,
      intervalMs: 5,
      maxMs: 200,
      tick: async () => {
        throw new Error("db down");
      },
    });
    const body = await response.text();
    expect(body).toContain("event: error");
  });
});
