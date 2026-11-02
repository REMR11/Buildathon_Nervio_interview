"use client";

import { IconFileTypeDocx, IconFileTypePdf } from "@tabler/icons-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface CvThumbnailProps {
  cvId: string;
  fileName: string;
  mimeType: string;
  /** Archivo recién elegido: se renderiza al instante sin pedirlo al servidor. */
  localFile?: File | null;
  /** Si el original quedó guardado en Storage (habilita abrirlo y la miniatura remota). */
  stored: boolean;
}

const WIDTH = 104;

type RenderState = "loading" | "ready" | "fallback";

/** Renderiza la primera página de un PDF en un canvas (pdfjs-dist, carga diferida). */
async function renderFirstPage(
  data: ArrayBuffer,
  canvas: HTMLCanvasElement,
  isCancelled: () => boolean,
) {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
  const task = pdfjs.getDocument({ data });
  const doc = await task.promise;
  try {
    const page = await doc.getPage(1);
    if (isCancelled()) return;
    const base = page.getViewport({ scale: 1 });
    const ratio = window.devicePixelRatio || 1;
    const viewport = page.getViewport({ scale: (WIDTH * ratio) / base.width });
    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);
    canvas.style.width = `${WIDTH}px`;
    canvas.style.height = `${Math.floor(viewport.height / ratio)}px`;
    await page.render({ canvas, viewport }).promise;
  } finally {
    void task.destroy();
  }
}

export function CvThumbnail({
  cvId,
  fileName,
  mimeType,
  localFile,
  stored,
}: CvThumbnailProps) {
  const isPdf = mimeType === "application/pdf";
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [state, setState] = useState<RenderState>(
    isPdf && (localFile || stored) ? "loading" : "fallback",
  );

  useEffect(() => {
    if (!isPdf || (!localFile && !stored)) {
      setState("fallback");
      return;
    }
    let cancelled = false;
    setState("loading");
    (async () => {
      try {
        const data = localFile
          ? await localFile.arrayBuffer()
          : await fetch(`/api/cv/${cvId}/file`).then((res) => {
              if (!res.ok) throw new Error(`HTTP ${res.status}`);
              return res.arrayBuffer();
            });
        const canvas = canvasRef.current;
        if (cancelled || !canvas) return;
        await renderFirstPage(data, canvas, () => cancelled);
        if (!cancelled) setState("ready");
      } catch (error) {
        console.warn("No se pudo generar la miniatura del CV:", error);
        if (!cancelled) setState("fallback");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [cvId, isPdf, localFile, stored]);

  const Icon = isPdf ? IconFileTypePdf : IconFileTypeDocx;
  const content = (
    <div
      className="relative flex min-h-[134px] w-[104px] shrink-0 items-center justify-center overflow-hidden rounded-md border border-white/15 bg-white shadow-sm"
      title={stored ? "Abrir CV en una pestaña nueva" : fileName}
    >
      <canvas
        ref={canvasRef}
        aria-hidden
        className={cn("block", state !== "ready" && "hidden")}
      />
      {state === "loading" ? (
        <div className="absolute inset-0 animate-pulse bg-muted" />
      ) : null}
      {state === "fallback" ? (
        <div className="flex flex-col items-center gap-1 bg-muted/40 px-2 text-center">
          <Icon
            className={cn("size-10", isPdf ? "text-red-500" : "text-blue-500")}
          />
          <span className="line-clamp-2 break-all text-[10px] text-slate-600">
            {fileName}
          </span>
        </div>
      ) : null}
    </div>
  );

  if (!stored) return content;
  return (
    <a
      href={`/api/cv/${cvId}/file`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Abrir ${fileName} en una pestaña nueva`}
      className="rounded-md transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-primary"
    >
      {content}
    </a>
  );
}
