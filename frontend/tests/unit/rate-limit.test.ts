import { afterEach, describe, expect, it } from "vitest";
import {
  checkCvUploadRateLimit,
  checkTokenRateLimit,
  resetRateLimitBucketsForTests,
} from "@/lib/rate-limit";

afterEach(() => {
  resetRateLimitBucketsForTests();
});

describe("checkTokenRateLimit", () => {
  it("permite los primeros intentos", () => {
    expect(checkTokenRateLimit("user-a").ok).toBe(true);
  });

  it("bloquea a los 5 intentos en un minuto", () => {
    for (let i = 0; i < 5; i++) {
      expect(checkTokenRateLimit("user-b").ok).toBe(true);
    }
    const blocked = checkTokenRateLimit("user-b");
    expect(blocked.ok).toBe(false);
    if (blocked.ok) return;
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
    expect(blocked.message).toMatch(/Demasiados intentos/);
  });

  it("aísla cubos por usuario", () => {
    for (let i = 0; i < 5; i++) checkTokenRateLimit("user-c");
    expect(checkTokenRateLimit("user-d").ok).toBe(true);
  });
});

describe("checkCvUploadRateLimit", () => {
  it("bloquea a las 5 subidas por minuto", () => {
    for (let i = 0; i < 5; i++) {
      expect(checkCvUploadRateLimit("cv-user").ok).toBe(true);
    }
    const blocked = checkCvUploadRateLimit("cv-user");
    expect(blocked.ok).toBe(false);
    if (blocked.ok) return;
    expect(blocked.message).toMatch(/Demasiadas subidas/);
  });
});
