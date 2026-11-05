import "./load-env";
import { afterEach, beforeEach, vi } from "vitest";
import { resetRateLimitBucketsForTests } from "@/lib/rate-limit";
import { clearRequestContext, getRequestHeaders } from "./request-context";

vi.mock("next/headers", () => ({
  headers: async () => getRequestHeaders(),
  cookies: async () => {
    const header = getRequestHeaders().get("cookie") ?? "";
    return {
      get(name: string) {
        const match = header
          .split(";")
          .map((part) => part.trim())
          .find((part) => part.startsWith(`${name}=`));
        if (!match) return undefined;
        return { name, value: match.slice(name.length + 1) };
      },
      getAll() {
        return [];
      },
      set() {},
      delete() {},
    };
  },
}));

vi.mock("next/server", async (importOriginal) => {
  const actual = await importOriginal<typeof import("next/server")>();
  return {
    ...actual,
    after: () => {
      // En pruebas no se encolan tareas post-respuesta (ElevenLabs / Resend).
    },
  };
});

vi.mock("@/lib/cv/storage", () => ({
  CVS_BUCKET: "cvs",
  uploadCvFile: vi.fn(async () => false),
  removeCvFile: vi.fn(async () => undefined),
  downloadCvFile: vi.fn(async () => null),
}));

const originalFetch = globalThis.fetch.bind(globalThis);
const blocked =
  /elevenlabs\.io|supabase\.co|resend\.com|api\.resend|n8n\.|webhook/i;

globalThis.fetch = (async (input, init) => {
  const url =
    typeof input === "string"
      ? input
      : input instanceof URL
        ? input.href
        : input.url;
  if (blocked.test(url)) {
    throw new Error(`Llamada externa bloqueada en pruebas: ${url}`);
  }
  return originalFetch(input, init);
}) as typeof fetch;

beforeEach(() => {
  clearRequestContext();
  resetRateLimitBucketsForTests();
});

afterEach(() => {
  clearRequestContext();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});
