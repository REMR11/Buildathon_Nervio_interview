/**
 * Utilidades de Server-Sent Events (SSE) para eventos de la app en tiempo real.
 *
 * Cada stream es stateless: el handler consulta la base de datos en un intervalo
 * corto del lado del servidor y emite solo los cambios autorizados para la sesión
 * actual. Al llegar a `maxMs` el stream se cierra y `EventSource` se reconecta
 * solo, enviando `Last-Event-ID` para reanudar sin perder eventos. Así funciona
 * en Vercel (funciones con duración limitada, múltiples instancias) sin un bus
 * de mensajes ni claves públicas de Supabase.
 */

export interface SseEvent {
  event: string;
  data: unknown;
  id?: string;
}

export interface SseTickResult {
  events?: SseEvent[];
  /** true para cerrar el stream (p. ej. el reporte ya está listo). */
  done?: boolean;
}

export interface SseOptions {
  signal: AbortSignal;
  intervalMs?: number;
  maxMs?: number;
  heartbeatMs?: number;
  /** Tiempo de reconexión sugerido al cliente. */
  retryMs?: number;
  tick: () => Promise<SseTickResult>;
}

export function encodeSse({ event, data, id }: SseEvent) {
  let out = "";
  if (id) out += `id: ${id}\n`;
  out += `event: ${event}\n`;
  out += `data: ${JSON.stringify(data)}\n\n`;
  return out;
}

const sleep = (ms: number, signal: AbortSignal) =>
  new Promise<void>((resolve) => {
    if (signal.aborted) return resolve();
    const t = setTimeout(resolve, ms);
    signal.addEventListener(
      "abort",
      () => {
        clearTimeout(t);
        resolve();
      },
      { once: true },
    );
  });

export function sseResponse({
  signal,
  intervalMs = 2000,
  maxMs = 50_000,
  heartbeatMs = 15_000,
  retryMs = 1500,
  tick,
}: SseOptions) {
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (chunk: string) => {
        try {
          controller.enqueue(encoder.encode(chunk));
        } catch {
          // el cliente ya cerró
        }
      };
      send(`retry: ${retryMs}\n: connected\n\n`);
      const startedAt = Date.now();
      let lastBeat = startedAt;
      try {
        while (!signal.aborted && Date.now() - startedAt < maxMs) {
          const { events = [], done } = await tick();
          for (const e of events) send(encodeSse(e));
          if (done) break;
          if (Date.now() - lastBeat >= heartbeatMs) {
            send(": ping\n\n");
            lastBeat = Date.now();
          }
          await sleep(intervalMs, signal);
        }
      } catch (error) {
        console.error("SSE tick error:", error);
        send(encodeSse({ event: "error", data: { message: "stream error" } }));
      } finally {
        try {
          controller.close();
        } catch {
          // ya cerrado
        }
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
