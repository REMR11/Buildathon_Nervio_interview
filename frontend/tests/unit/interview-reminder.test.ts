import { describe, expect, it } from "vitest";
import {
  formatReminderOffset,
  isPresetOffset,
  minutesToCustomParts,
  reminderAtFrom,
  unitToMinutes,
} from "@/lib/interview/reminder";

describe("unitToMinutes / minutesToCustomParts", () => {
  it("convierte unidades a minutos", () => {
    expect(unitToMinutes(15, "minutes")).toBe(15);
    expect(unitToMinutes(2, "hours")).toBe(120);
    expect(unitToMinutes(1, "days")).toBe(1440);
  });

  it("elige la unidad más grande al descomponer", () => {
    expect(minutesToCustomParts(1440)).toEqual({ value: 1, unit: "days" });
    expect(minutesToCustomParts(120)).toEqual({ value: 2, unit: "hours" });
    expect(minutesToCustomParts(15)).toEqual({ value: 15, unit: "minutes" });
  });
});

describe("formatReminderOffset", () => {
  it("formatea minutos, horas y días", () => {
    expect(formatReminderOffset(1)).toBe("1 minuto antes");
    expect(formatReminderOffset(15)).toBe("15 minutos antes");
    expect(formatReminderOffset(60)).toBe("1 hora antes");
    expect(formatReminderOffset(120)).toBe("2 horas antes");
    expect(formatReminderOffset(1440)).toBe("1 día antes");
    expect(formatReminderOffset(2880)).toBe("2 días antes");
  });
});

describe("reminderAtFrom", () => {
  it("resta el offset a la cita", () => {
    const scheduled = new Date("2026-03-01T15:00:00.000Z");
    expect(reminderAtFrom(scheduled, 60).toISOString()).toBe(
      "2026-03-01T14:00:00.000Z",
    );
  });
});

describe("isPresetOffset", () => {
  it("reconoce los presets de la UI", () => {
    expect(isPresetOffset(15)).toBe(true);
    expect(isPresetOffset(90)).toBe(false);
  });
});
