import { afterEach, describe, expect, it, vi } from "vitest";
import { isStorageConfigured } from "@/lib/storage/supabase-server";

describe("isStorageConfigured", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("es false si faltan URL o service role", () => {
    vi.stubEnv("SUPABASE_URL", "");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");
    expect(isStorageConfigured()).toBe(false);
  });

  it("es true solo con ambos valores", () => {
    vi.stubEnv("SUPABASE_URL", "https://project.supabase.co");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "service-role-test");
    expect(isStorageConfigured()).toBe(true);
  });
});
