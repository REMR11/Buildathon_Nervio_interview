import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildGoogleCalendarUrl,
  buildInterviewJoinUrl,
} from "@/lib/email/schedule-confirmation";

describe("buildInterviewJoinUrl", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("usa NEXT_PUBLIC_APP_URL sin barra final", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://app.nervio.test/");
    expect(buildInterviewJoinUrl("abc")).toBe(
      "https://app.nervio.test/interview/abc",
    );
  });
});

describe("buildGoogleCalendarUrl", () => {
  it("arma una plantilla con fechas UTC", () => {
    const url = new URL(
      buildGoogleCalendarUrl({
        title: "Entrevista",
        details: "Detalle",
        location: "https://app.nervio.test/interview/1",
        start: new Date("2026-03-01T15:00:00.000Z"),
        end: new Date("2026-03-01T15:45:00.000Z"),
      }),
    );
    expect(url.searchParams.get("action")).toBe("TEMPLATE");
    expect(url.searchParams.get("dates")).toBe(
      "20260301T150000Z/20260301T154500Z",
    );
    expect(url.searchParams.get("text")).toBe("Entrevista");
  });
});
