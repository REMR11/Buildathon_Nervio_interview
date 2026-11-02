"use client";

import {
  IconAlertTriangle,
  IconCircleCheck,
  IconFileText,
  IconHistory,
  IconTrash,
  IconUpload,
  IconX,
} from "@tabler/icons-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import {
  type CandidateCvSummary,
  CV_ACCEPT,
  CV_MAX_BYTES,
  CV_MAX_TEXT_CHARS,
  type CvUploadResponse,
} from "@/lib/cv/constants";
import { cn } from "@/lib/utils";

export interface CvSelection {
  cvId: string;
  cvText: string;
}

interface CvUploadFieldProps {
  value: CvSelection | null;
  onChange: (value: CvSelection | null) => void;
  disabled?: boolean;
}

type Status =
  | { kind: "idle" }
  | { kind: "uploading"; fileName: string }
  | { kind: "success"; cv: CandidateCvSummary; warning: string | null }
  | { kind: "error"; message: string };

function formatSize(bytes: number) {
  return bytes >= 1024 * 1024
    ? `${(bytes / 1024 / 1024).toFixed(1)} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

export function CvUploadField({
  value,
  onChange,
  disabled,
}: CvUploadFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [lastCv, setLastCv] = useState<CandidateCvSummary | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/cv")
      .then((res) => (res.ok ? res.json() : { cvs: [] }))
      .then((data: { cvs: CandidateCvSummary[] }) => {
        if (!cancelled) setLastCv(data.cvs[0] ?? null);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  const select = useCallback(
    (cv: CandidateCvSummary, warning: string | null) => {
      setStatus({ kind: "success", cv, warning });
      onChange({ cvId: cv.id, cvText: cv.extractedText });
    },
    [onChange],
  );

  const upload = async (file: File) => {
    const ext = file.name.toLowerCase().split(".").pop();
    if (ext !== "pdf" && ext !== "docx") {
      setStatus({
        kind: "error",
        message: "Solo se aceptan archivos PDF o DOCX.",
      });
      return;
    }
    if (file.size > CV_MAX_BYTES) {
      setStatus({
        kind: "error",
        message: "El archivo supera el máximo de 5 MB.",
      });
      return;
    }
    setStatus({ kind: "uploading", fileName: file.name });
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/cv", { method: "POST", body });
      const data = (await res.json().catch(() => ({}))) as Partial<
        CvUploadResponse & { error: string }
      >;
      if (!res.ok || !data.cv) {
        throw new Error(data.error ?? `Error HTTP ${res.status}`);
      }
      setLastCv(data.cv);
      select(data.cv, data.storageWarning ?? null);
    } catch (error) {
      setStatus({
        kind: "error",
        message:
          error instanceof Error ? error.message : "No se pudo subir el CV.",
      });
    }
  };

  const clear = () => {
    setStatus({ kind: "idle" });
    onChange(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  const removeFromHistory = async (cv: CandidateCvSummary) => {
    const res = await fetch(`/api/cv/${cv.id}`, { method: "DELETE" });
    if (res.ok || res.status === 404) {
      if (lastCv?.id === cv.id) setLastCv(null);
      clear();
    }
  };

  const busy = disabled || status.kind === "uploading";

  if (status.kind === "success" && value) {
    const { cv, warning } = status;
    return (
      <div className="flex flex-col gap-3 rounded-lg border border-primary/40 bg-primary/5 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 text-sm">
            <IconCircleCheck className="size-5 shrink-0 text-primary" />
            <div>
              <p className="font-medium">{cv.fileName}</p>
              <p className="text-xs text-muted-foreground">
                {formatSize(cv.sizeBytes)}
                {cv.pageCount ? ` · ${cv.pageCount} pág.` : ""} ·{" "}
                {cv.extractedText.length} caracteres extraídos
                {cv.truncated ? " (recortado a 8000)" : ""}
              </p>
            </div>
          </div>
          <div className="flex gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={clear}
              disabled={disabled}
              aria-label="Quitar CV de esta entrevista"
            >
              <IconX className="size-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => removeFromHistory(cv)}
              disabled={disabled}
              aria-label="Eliminar CV de mi cuenta"
            >
              <IconTrash className="size-4" />
            </Button>
          </div>
        </div>
        {warning ? (
          <p className="flex items-start gap-2 text-xs text-amber-400">
            <IconAlertTriangle className="size-4 shrink-0" />
            {warning}
          </p>
        ) : null}
        <label htmlFor="cvText" className="text-xs text-muted-foreground">
          Revisa y corrige el texto que leerá el entrevistador:
        </label>
        <Textarea
          id="cvText"
          rows={8}
          maxLength={CV_MAX_TEXT_CHARS}
          value={value.cvText}
          disabled={disabled}
          onChange={(event) =>
            onChange({ cvId: value.cvId, cvText: event.target.value })
          }
          className="font-mono text-xs"
        />
        <p className="text-right text-xs text-muted-foreground">
          {value.cvText.length}/{CV_MAX_TEXT_CHARS}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        disabled={busy}
        onClick={() => inputRef.current?.click()}
        onDragOver={(event) => {
          event.preventDefault();
          if (!busy) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          const file = event.dataTransfer.files[0];
          if (file && !busy) void upload(file);
        }}
        className={cn(
          "flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-white/20 bg-muted/30 px-4 py-6 text-center text-sm transition-colors hover:bg-muted/50 disabled:cursor-not-allowed disabled:opacity-60",
          dragging && "border-primary bg-primary/10",
          status.kind === "error" && "border-destructive/60",
        )}
      >
        {status.kind === "uploading" ? (
          <>
            <Spinner />
            <span>Leyendo {status.fileName}…</span>
          </>
        ) : (
          <>
            <IconUpload className="size-6 text-muted-foreground" />
            <span>
              Arrastra tu CV aquí o <strong>haz clic para elegirlo</strong>
            </span>
            <span className="text-xs text-muted-foreground">
              PDF o DOCX · máx. 5 MB · 10 páginas
            </span>
          </>
        )}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept={CV_ACCEPT}
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void upload(file);
        }}
      />
      {status.kind === "error" ? (
        <p
          role="alert"
          className="flex items-start gap-2 text-xs text-destructive"
        >
          <IconAlertTriangle className="size-4 shrink-0" />
          {status.message}
        </p>
      ) : null}
      {lastCv ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="self-start"
          disabled={busy}
          onClick={() => select(lastCv, null)}
        >
          <IconHistory className="size-4" />
          Usar mi último CV
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <IconFileText className="size-3" />
            {lastCv.fileName} ·{" "}
            {new Date(lastCv.createdAt).toLocaleDateString("es")}
          </span>
        </Button>
      ) : null}
    </div>
  );
}
