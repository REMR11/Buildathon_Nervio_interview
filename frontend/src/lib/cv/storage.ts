import { getStorageClient } from "@/lib/storage/supabase-server";
import { CV_MAX_BYTES } from "./constants";

export const CVS_BUCKET = process.env.SUPABASE_CVS_BUCKET ?? "cvs";

let bucketReady = false;

/** Crea el bucket privado `cvs` si no existe. Devuelve false si Storage no está configurado. */
async function ensureCvBucket(): Promise<boolean> {
  const client = getStorageClient();
  if (!client) return false;
  if (bucketReady) return true;
  const { data } = await client.storage.getBucket(CVS_BUCKET);
  if (!data) {
    const { error } = await client.storage.createBucket(CVS_BUCKET, {
      public: false,
      fileSizeLimit: CV_MAX_BYTES,
    });
    if (error && !/already exists/i.test(error.message)) {
      console.error("No se pudo crear el bucket de CVs:", error.message);
      return false;
    }
  }
  bucketReady = true;
  return true;
}

export async function uploadCvFile(
  path: string,
  bytes: Uint8Array,
  contentType: string,
): Promise<boolean> {
  if (!(await ensureCvBucket())) return false;
  const client = getStorageClient();
  if (!client) return false;
  const { error } = await client.storage
    .from(CVS_BUCKET)
    .upload(path, bytes, { contentType, upsert: false });
  if (error) {
    console.error("Error subiendo CV a Storage:", error.message);
    return false;
  }
  return true;
}

export async function removeCvFile(path: string) {
  const client = getStorageClient();
  if (!client) return;
  const { error } = await client.storage.from(CVS_BUCKET).remove([path]);
  if (error) console.warn("No se pudo borrar el CV de Storage:", error.message);
}
