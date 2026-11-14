import { beforeEach, describe, expect, it, vi } from "vitest";
import { CV_MAX_TEXT_CHARS, CV_MIN_TEXT_CHARS } from "@/lib/cv/constants";
import { CvValidationError, cleanCvText, detectCvKind } from "@/lib/cv/extract";
import {
  docxMagicBytes,
  FICTIONAL_CV_TEXT,
  pdfMagicBytes,
} from "../fixtures/cv";

describe("detectCvKind", () => {
  it("reconoce un PDF por magic bytes y extensión", () => {
    expect(detectCvKind("cv.pdf", pdfMagicBytes())).toBe("pdf");
  });

  it("reconoce un DOCX por ZIP + word/", () => {
    expect(detectCvKind("cv.docx", docxMagicBytes())).toBe("docx");
  });

  it("rechaza una extensión no permitida", () => {
    expect(() => detectCvKind("cv.txt", pdfMagicBytes())).toThrow(
      CvValidationError,
    );
    try {
      detectCvKind("cv.txt", pdfMagicBytes());
    } catch (error) {
      expect(error).toBeInstanceOf(CvValidationError);
      expect((error as CvValidationError).status).toBe(415);
    }
  });

  it("rechaza un PDF cuyo contenido no coincide", () => {
    expect(() => detectCvKind("cv.pdf", docxMagicBytes())).toThrow(
      /no coincide/,
    );
  });
});

describe("cleanCvText", () => {
  it("colapsa espacios y recorta", () => {
    expect(cleanCvText("  Hola   mundo  \n\n\n  ")).toEqual({
      text: "Hola mundo",
      truncated: false,
    });
  });

  it("marca truncated al superar el máximo", () => {
    const raw = "a".repeat(CV_MAX_TEXT_CHARS + 50);
    const result = cleanCvText(raw);
    expect(result.truncated).toBe(true);
    expect(result.text.length).toBeLessThanOrEqual(CV_MAX_TEXT_CHARS);
  });
});

describe("extractCvText", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("extrae texto de un PDF mockeando unpdf", async () => {
    vi.doMock("unpdf", () => ({
      getDocumentProxy: vi.fn(async () => ({ numPages: 1 })),
      extractText: vi.fn(async () => ({ text: FICTIONAL_CV_TEXT })),
    }));
    const { extractCvText: extract } = await import("@/lib/cv/extract");
    const result = await extract("pdf", pdfMagicBytes());
    expect(result.text).toContain("CV de prueba");
    expect(result.pageCount).toBe(1);
    expect(result.truncated).toBe(false);
    vi.doUnmock("unpdf");
  });

  it("lanza 422 si el PDF supera el máximo de páginas", async () => {
    vi.doMock("unpdf", () => ({
      getDocumentProxy: vi.fn(async () => ({ numPages: 11 })),
      extractText: vi.fn(),
    }));
    const { extractCvText: extract, CvValidationError: Err } = await import(
      "@/lib/cv/extract"
    );
    await expect(extract("pdf", pdfMagicBytes())).rejects.toBeInstanceOf(Err);
    vi.doUnmock("unpdf");
  });

  it("lanza 422 si no hay texto suficiente", async () => {
    vi.doMock("unpdf", () => ({
      getDocumentProxy: vi.fn(async () => ({ numPages: 1 })),
      extractText: vi.fn(async () => ({ text: "corto" })),
    }));
    const { extractCvText: extract } = await import("@/lib/cv/extract");
    await expect(extract("pdf", pdfMagicBytes())).rejects.toThrow(
      /No encontramos texto/,
    );
    vi.doUnmock("unpdf");
  });

  it("extrae texto de un DOCX mockeando mammoth", async () => {
    vi.doMock("mammoth", () => ({
      extractRawText: vi.fn(async () => ({ value: FICTIONAL_CV_TEXT })),
    }));
    const { extractCvText: extract } = await import("@/lib/cv/extract");
    const result = await extract("docx", docxMagicBytes());
    expect(result.text.length).toBeGreaterThanOrEqual(CV_MIN_TEXT_CHARS);
    expect(result.pageCount).toBeNull();
    vi.doUnmock("mammoth");
  });

  it("envuelve errores de lectura como 422", async () => {
    vi.doMock("unpdf", () => ({
      getDocumentProxy: vi.fn(async () => {
        throw new Error("boom");
      }),
      extractText: vi.fn(),
    }));
    const { extractCvText: extract } = await import("@/lib/cv/extract");
    await expect(extract("pdf", pdfMagicBytes())).rejects.toThrow(
      /No pudimos leer el archivo/,
    );
    vi.doUnmock("unpdf");
  });
});
