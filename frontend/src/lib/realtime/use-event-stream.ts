"use client";

import { useEffect, useRef, useState } from "react";

export type StreamState = "connecting" | "open" | "closed";

/**
 * Se suscribe a un endpoint SSE de la app con `EventSource` (la cookie de
 * sesión viaja sola por ser mismo origen). Se reconecta automáticamente.
 * `handlers` puede cambiar entre renders sin reabrir la conexión.
 */
export function useEventStream(
  url: string | null,
  handlers: Record<string, (data: unknown) => void>,
) {
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;
  const [state, setState] = useState<StreamState>("connecting");
  const eventNames = Object.keys(handlers).sort().join(",");

  useEffect(() => {
    if (!url || typeof EventSource === "undefined") return;
    const source = new EventSource(url);
    setState("connecting");
    source.onopen = () => setState("open");
    source.onerror = () =>
      setState(
        source.readyState === EventSource.CLOSED ? "closed" : "connecting",
      );
    const listeners = eventNames
      .split(",")
      .filter(Boolean)
      .map((name) => {
        const listener = (e: MessageEvent) => {
          let data: unknown = null;
          try {
            data = JSON.parse(e.data);
          } catch {
            data = e.data;
          }
          handlersRef.current[name]?.(data);
        };
        source.addEventListener(name, listener);
        return [name, listener] as const;
      });
    return () => {
      for (const [name, listener] of listeners)
        source.removeEventListener(name, listener);
      source.close();
      setState("closed");
    };
  }, [url, eventNames]);

  return state;
}
