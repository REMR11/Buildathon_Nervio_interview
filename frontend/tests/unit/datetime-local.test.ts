import { describe, expect, it } from "vitest";
import { toDatetimeLocalValue } from "@/lib/datetime-local";

describe("toDatetimeLocalValue", () => {
  it("devuelve el formato YYYY-MM-DDTHH:mm", () => {
    const value = toDatetimeLocalValue(new Date("2026-06-01T15:30:00.000Z"));
    expect(value).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
  });
});
