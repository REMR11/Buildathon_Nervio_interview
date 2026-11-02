import { prisma } from "@/lib/prisma";
import {
  getStorageClient,
  isStorageConfigured,
  RECORDINGS_BUCKET,
} from "@/lib/storage/supabase-server";

/** Igual que la retención de audio configurada en el agente de ElevenLabs. */
export const RECORDING_RETENTION_DAYS = 14;
const DAY_MS = 24 * 60 * 60 * 1000;
const RECORDING_TYPE = "full_call";
const SIGNED_URL_TTL_SECS = 60 * 10;

export type RecordingStatus =
  | "available"
  | "processing"
  | "expired"
  | "unavailable";

export interface RecordingInfo {
  status: RecordingStatus;
  url: string | null;
  source: "storage" | "elevenlabs" | null;
  expiresAt: string | null;
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function recordingExpiry(callStartedAt: Date) {
  return new Date(callStartedAt.getTime() + RECORDING_RETENTION_DAYS * DAY_MS);
}

function elevenLabsAudioUrl(conversationId: string) {
  return `https://api.elevenlabs.io/v1/convai/conversations/${encodeURIComponent(
    conversationId,
  )}/audio`;
}

/** Descarga el audio desde ElevenLabs. Devuelve null si aún no está listo. */
export async function fetchElevenLabsAudio(
  conversationId: string,
): Promise<Response | null> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) return null;
  const response = await fetch(elevenLabsAudioUrl(conversationId), {
    headers: { "xi-api-key": apiKey },
    cache: "no-store",
  });
  if (!response.ok || !response.body) {
    await response.body?.cancel().catch(() => undefined);
    return null;
  }
  return response;
}

/**
 * Copia el audio de la llamada a Supabase Storage. Pensado para correr en
 * `after()`: el audio puede tardar en estar disponible, así que reintenta.
 * Idempotente: si ya existe una grabación activa no hace nada.
 */
export async function archiveConversationAudio(
  sessionId: string,
  conversationId: string,
  { attempts = 6, waitMs = 10_000 } = {},
): Promise<boolean> {
  const storage = getStorageClient();
  if (!storage) return false;

  const existing = await prisma.recordings.findFirst({
    where: { sessionId, type: RECORDING_TYPE, storagePath: { not: null } },
    select: { id: true },
  });
  if (existing) return true;

  const session = await prisma.interviewSession.findUnique({
    where: { id: sessionId },
    select: { startedAt: true, createdAt: true },
  });
  if (!session) return false;
  const callStartedAt = session.startedAt ?? session.createdAt;
  const expiresAt = recordingExpiry(callStartedAt);
  if (expiresAt.getTime() <= Date.now()) return false;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    if (attempt > 0) await delay(waitMs * attempt);
    const response = await fetchElevenLabsAudio(conversationId);
    if (!response) continue;

    const audio = new Uint8Array(await response.arrayBuffer());
    if (audio.byteLength === 0) continue;

    const storagePath = `${sessionId}/${conversationId}.mp3`;
    const { error } = await storage.storage
      .from(RECORDINGS_BUCKET)
      .upload(storagePath, audio, { contentType: "audio/mpeg", upsert: true });
    if (error) {
      console.error("Recording upload error:", error.message);
      continue;
    }

    await prisma.recordings.create({
      data: {
        sessionId,
        type: RECORDING_TYPE,
        audioUrl: `storage://${RECORDINGS_BUCKET}/${storagePath}`,
        storagePath,
        createdAt: callStartedAt,
        expiresAt,
      },
    });
    return true;
  }

  console.error(
    `Recording archive gave up for session ${sessionId} after ${attempts} attempts`,
  );
  return false;
}

/**
 * Estado de la grabación de una sesión. La propiedad de la sesión debe
 * validarse antes de llamar a esta función.
 */
export async function getRecordingInfo(
  sessionId: string,
): Promise<RecordingInfo> {
  const session = await prisma.interviewSession.findUnique({
    where: { id: sessionId },
    select: {
      startedAt: true,
      createdAt: true,
      endedAt: true,
      elevenlabsConversationId: true,
      recordings: {
        where: { type: RECORDING_TYPE },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });
  if (!session) {
    return { status: "unavailable", url: null, source: null, expiresAt: null };
  }

  const callStartedAt = session.startedAt ?? session.createdAt;
  const expiresAt = recordingExpiry(callStartedAt);
  const expired = expiresAt.getTime() <= Date.now();
  const recording = session.recordings[0];

  if (
    recording?.deletedAt ||
    (recording && expired) ||
    (!recording && expired)
  ) {
    return {
      status: "expired",
      url: null,
      source: null,
      expiresAt: expiresAt.toISOString(),
    };
  }

  const storage = getStorageClient();
  if (recording?.storagePath && storage) {
    const { data, error } = await storage.storage
      .from(RECORDINGS_BUCKET)
      .createSignedUrl(recording.storagePath, SIGNED_URL_TTL_SECS);
    if (data?.signedUrl && !error) {
      return {
        status: "available",
        url: data.signedUrl,
        source: "storage",
        expiresAt: (recording.expiresAt ?? expiresAt).toISOString(),
      };
    }
  }

  // Respaldo mientras la copia no existe: proxy autenticado hacia ElevenLabs,
  // que conserva el audio el mismo número de días.
  if (session.elevenlabsConversationId && process.env.ELEVENLABS_API_KEY) {
    return {
      status: "available",
      url: `/api/interview/${sessionId}/recording/audio`,
      source: "elevenlabs",
      expiresAt: expiresAt.toISOString(),
    };
  }

  return {
    status: session.endedAt ? "unavailable" : "processing",
    url: null,
    source: null,
    expiresAt: expiresAt.toISOString(),
  };
}

/** Borra del bucket las grabaciones vencidas y las marca como eliminadas. */
export async function cleanupExpiredRecordings(now = new Date()) {
  const due = await prisma.recordings.findMany({
    where: {
      deletedAt: null,
      OR: [
        { expiresAt: { lte: now } },
        {
          expiresAt: null,
          createdAt: {
            lte: new Date(now.getTime() - RECORDING_RETENTION_DAYS * DAY_MS),
          },
        },
      ],
    },
    select: { id: true, storagePath: true },
    take: 500,
  });
  if (due.length === 0)
    return { deleted: 0, storageConfigured: isStorageConfigured() };

  const storage = getStorageClient();
  const paths = due
    .map((r) => r.storagePath)
    .filter((p): p is string => Boolean(p));
  if (paths.length > 0) {
    if (!storage) {
      return { deleted: 0, pending: due.length, storageConfigured: false };
    }
    const { error } = await storage.storage
      .from(RECORDINGS_BUCKET)
      .remove(paths);
    if (error) throw new Error(`Storage remove failed: ${error.message}`);
  }

  await prisma.recordings.updateMany({
    where: { id: { in: due.map((r) => r.id) } },
    data: { deletedAt: now },
  });
  return { deleted: due.length, storageConfigured: isStorageConfigured() };
}
