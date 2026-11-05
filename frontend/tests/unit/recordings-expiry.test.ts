import { describe, expect, it } from "vitest";
import {
  RECORDING_RETENTION_DAYS,
  recordingExpiry,
} from "@/lib/interview/recordings";

describe("recordingExpiry", () => {
  it("suma 14 días al inicio de la llamada", () => {
    expect(RECORDING_RETENTION_DAYS).toBe(14);
    const start = new Date("2026-01-01T00:00:00.000Z");
    expect(recordingExpiry(start).toISOString()).toBe(
      "2026-01-15T00:00:00.000Z",
    );
  });
});
