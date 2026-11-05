import { describe, expect, it } from "vitest";

/**
 * Copia de la validación de `resolveShareToken` para cubrir el formato
 * sin tocar la base. El flujo con Prisma se cubre en integración.
 */
const TOKEN_RE = /^[A-Za-z0-9_-]{20,64}$/;

describe("formato de token de reporte compartido", () => {
  it("acepta tokens url-safe de longitud suficiente", () => {
    expect(TOKEN_RE.test("a".repeat(20))).toBe(true);
    expect(TOKEN_RE.test("Abc_123-xyzABCDEFGHIJ")).toBe(true);
  });

  it("rechaza tokens cortos o con caracteres raros", () => {
    expect(TOKEN_RE.test("corto")).toBe(false);
    expect(TOKEN_RE.test("token con espacios 1234567")).toBe(false);
  });
});
