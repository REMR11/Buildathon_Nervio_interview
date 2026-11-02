import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export const RECORDINGS_BUCKET =
  process.env.SUPABASE_RECORDINGS_BUCKET ?? "interview-recordings";

let client: SupabaseClient | null = null;

/** Indica si hay credenciales de servidor para Supabase Storage. */
export function isStorageConfigured() {
  return Boolean(
    process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
}

/** Cliente con service role. Solo para código de servidor; nunca exponer al navegador. */
export function getStorageClient(): SupabaseClient | null {
  if (!isStorageConfigured()) return null;
  client ??= createClient(
    process.env.SUPABASE_URL as string,
    process.env.SUPABASE_SERVICE_ROLE_KEY as string,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  return client;
}
