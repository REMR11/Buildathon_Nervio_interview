"use client";

import { IconMicrophone, IconPlayerPlay } from "@tabler/icons-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

export const INPUT_DEVICE_STORAGE_KEY = "nervio:input-device";

interface InterviewMicCheckProps {
  role: string;
  onReady: () => void;
}

type MicStatus = "idle" | "requesting" | "ok" | "denied" | "error";

/** Prueba de micrófono previa: permiso, selector de dispositivo y vúmetro. */
export function InterviewMicCheck({ role, onReady }: InterviewMicCheckProps) {
  const [status, setStatus] = useState<MicStatus>("idle");
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [deviceId, setDeviceId] = useState<string>("");
  const [level, setLevel] = useState(0);
  const [heardVoice, setHeardVoice] = useState(false);
  const streamRef = useRef<MediaStream | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const rafRef = useRef<number | null>(null);

  const stop = useCallback(() => {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    for (const track of streamRef.current?.getTracks() ?? []) track.stop();
    streamRef.current = null;
    void ctxRef.current?.close().catch(() => undefined);
    ctxRef.current = null;
  }, []);

  const start = useCallback(
    async (id?: string) => {
      stop();
      setStatus("requesting");
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: id
            ? { deviceId: { exact: id }, echoCancellation: true }
            : { echoCancellation: true },
        });
        streamRef.current = stream;
        const activeId = stream.getAudioTracks()[0]?.getSettings().deviceId;
        const list = (await navigator.mediaDevices.enumerateDevices()).filter(
          (d) => d.kind === "audioinput",
        );
        setDevices(list);
        if (activeId) setDeviceId(activeId);

        const ctx = new AudioContext();
        ctxRef.current = ctx;
        if (ctx.state === "suspended") {
          // Autoplay policy: resume on the next user gesture if needed.
          void ctx.resume().catch(() => undefined);
          const resumeOnGesture = () => {
            if (ctxRef.current === ctx && ctx.state === "suspended") {
              void ctx.resume().catch(() => undefined);
            }
          };
          window.addEventListener("pointerdown", resumeOnGesture, {
            once: true,
          });
          window.addEventListener("keydown", resumeOnGesture, { once: true });
        }
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 512;
        ctx.createMediaStreamSource(stream).connect(analyser);
        const data = new Uint8Array(analyser.fftSize);
        const tick = () => {
          analyser.getByteTimeDomainData(data);
          let sum = 0;
          for (const v of data) {
            const x = (v - 128) / 128;
            sum += x * x;
          }
          const rms = Math.min(1, Math.sqrt(sum / data.length) * 4);
          setLevel(rms);
          if (rms > 0.15) setHeardVoice(true);
          rafRef.current = requestAnimationFrame(tick);
        };
        tick();
        setStatus("ok");
      } catch (error) {
        const name = error instanceof DOMException ? error.name : "";
        setStatus(
          name === "NotAllowedError" || name === "SecurityError"
            ? "denied"
            : "error",
        );
      }
    },
    [stop],
  );

  useEffect(() => {
    void start(window.sessionStorage.getItem(INPUT_DEVICE_STORAGE_KEY) ?? "");
    return stop;
  }, [start, stop]);

  const handleStart = () => {
    if (deviceId) {
      window.sessionStorage.setItem(INPUT_DEVICE_STORAGE_KEY, deviceId);
    }
    stop();
    onReady();
  };

  const bars = 20;
  const active = Math.round(level * bars);

  return (
    <main className="relative z-10 flex min-h-screen items-center justify-center px-6">
      <div className="glass-panel w-full max-w-md space-y-6 rounded-2xl p-8">
        <div className="text-center">
          <IconMicrophone className="mx-auto size-10 text-primary" />
          <h1 className="mt-3 font-[family-name:var(--font-heading)] text-2xl font-bold">
            Prueba tu micrófono
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Entrevista para {role}. Di algo para comprobar que te escuchamos.
          </p>
        </div>

        {status === "denied" ? (
          <p className="rounded-lg bg-red-500/10 p-3 text-sm text-red-600">
            Bloqueaste el acceso al micrófono. Actívalo en la configuración del
            navegador (icono del candado) y vuelve a intentarlo.
          </p>
        ) : null}
        {status === "error" ? (
          <p className="rounded-lg bg-red-500/10 p-3 text-sm text-red-600">
            No encontramos un micrófono disponible. Conecta uno y reintenta.
          </p>
        ) : null}

        {devices.length > 0 ? (
          <label className="block space-y-1 text-sm">
            <span className="text-muted-foreground">Micrófono</span>
            <select
              className="w-full rounded-md border bg-background px-3 py-2"
              value={deviceId}
              onChange={(e) => {
                setDeviceId(e.target.value);
                setHeardVoice(false);
                void start(e.target.value);
              }}
            >
              {devices.map((d, i) => (
                <option key={d.deviceId || i} value={d.deviceId}>
                  {d.label || `Micrófono ${i + 1}`}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        <div className="flex h-8 items-end gap-1" aria-hidden="true">
          {Array.from({ length: bars }, (_, i) => (
            <div
              // biome-ignore lint/suspicious/noArrayIndexKey: barras fijas
              key={i}
              className={`flex-1 rounded-sm transition-colors ${
                i < active ? "bg-primary" : "bg-muted"
              }`}
              style={{ height: `${30 + (i / bars) * 70}%` }}
            />
          ))}
        </div>
        <p className="text-center text-xs text-muted-foreground">
          {status === "requesting"
            ? "Solicitando permiso…"
            : heardVoice
              ? "¡Te escuchamos bien!"
              : status === "ok"
                ? "Habla para ver el nivel."
                : ""}
        </p>

        <div className="flex flex-col gap-2">
          <Button onClick={handleStart} disabled={status !== "ok"}>
            <IconPlayerPlay className="size-4" data-icon="inline-start" />
            Comenzar entrevista
          </Button>
          {status === "denied" || status === "error" ? (
            <Button variant="outline" onClick={() => void start(deviceId)}>
              Reintentar
            </Button>
          ) : null}
        </div>
      </div>
    </main>
  );
}
