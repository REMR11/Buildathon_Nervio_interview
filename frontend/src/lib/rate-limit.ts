// Limitador en memoria por usuario para /api/elevenlabs/token.
// Suficiente para una sola instancia (demo); en producción multi-instancia usar Redis/DB.
type Bucket = { minute: number[]; day: number[] };

const buckets = new Map<string, Bucket>();
const MINUTE_MS = 60_000;
const DAY_MS = 24 * 60 * 60_000;
const PER_MINUTE = 5;
const PER_DAY = 30;

export type RateLimitResult =
  | { ok: true }
  | { ok: false; message: string; retryAfterSeconds: number };

export function checkTokenRateLimit(userId: string): RateLimitResult {
  const now = Date.now();
  const bucket = buckets.get(userId) ?? { minute: [], day: [] };
  bucket.minute = bucket.minute.filter((t) => now - t < MINUTE_MS);
  bucket.day = bucket.day.filter((t) => now - t < DAY_MS);

  if (bucket.day.length >= PER_DAY) {
    buckets.set(userId, bucket);
    return {
      ok: false,
      message:
        "Alcanzaste el límite diario de entrevistas por voz. Vuelve mañana.",
      retryAfterSeconds: Math.ceil((DAY_MS - (now - bucket.day[0])) / 1000),
    };
  }

  if (bucket.minute.length >= PER_MINUTE) {
    buckets.set(userId, bucket);
    return {
      ok: false,
      message:
        "Demasiados intentos seguidos. Espera un minuto antes de iniciar otra entrevista.",
      retryAfterSeconds: Math.ceil(
        (MINUTE_MS - (now - bucket.minute[0])) / 1000,
      ),
    };
  }

  bucket.minute.push(now);
  bucket.day.push(now);
  buckets.set(userId, bucket);
  return { ok: true };
}
