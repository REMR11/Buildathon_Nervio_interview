import { describe, expect, it } from "vitest";
import type { CandidateCv } from "@/generated/prisma/client";
import { toCvSummary } from "@/lib/cv/serialize";
import { FICTIONAL_CV_TEXT } from "../fixtures/cv";

function cv(overrides: Partial<CandidateCv> = {}): CandidateCv {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    userId: "user-1",
    fileName: "cv.pdf",
    mimeType: "application/pdf",
    sizeBytes: 2048,
    pageCount: 2,
    storagePath: "user-1/cv.pdf",
    extractedText: FICTIONAL_CV_TEXT,
    truncated: false,
    createdAt: new Date("2026-01-15T12:00:00.000Z"),
    ...overrides,
  };
}

describe("toCvSummary", () => {
  it("serializa fechas ISO y stored=true si hay path", () => {
    const summary = toCvSummary(cv());
    expect(summary.stored).toBe(true);
    expect(summary.createdAt).toBe("2026-01-15T12:00:00.000Z");
    expect(summary.fileName).toBe("cv.pdf");
    expect(summary.extractedText).toBe(FICTIONAL_CV_TEXT);
  });

  it("marca stored=false si no hay archivo en Storage", () => {
    expect(toCvSummary(cv({ storagePath: null })).stored).toBe(false);
  });
});
