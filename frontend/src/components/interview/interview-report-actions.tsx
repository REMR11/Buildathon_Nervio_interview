"use client";

import {
  IconCheck,
  IconCopy,
  IconDownload,
  IconLinkOff,
  IconShare,
} from "@tabler/icons-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

/** Descargar PDF y crear / copiar / revocar enlace público del reporte. */
export function InterviewReportActions({ sessionId }: { sessionId: string }) {
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const copy = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setMessage("Copia el enlace manualmente.");
    }
  };

  const createShare = async () => {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/interview/${sessionId}/share`, {
        method: "POST",
      });
      const body = (await res.json()) as {
        url?: string;
        expiresAt?: string;
        error?: string;
      };
      if (!res.ok || !body.url) throw new Error(body.error);
      setShareUrl(body.url);
      if (body.expiresAt) {
        setMessage(
          `Válido hasta el ${new Date(body.expiresAt).toLocaleDateString("es-SV")}.`,
        );
      }
      await copy(body.url);
    } catch (error) {
      setMessage(
        error instanceof Error && error.message
          ? error.message
          : "No se pudo crear el enlace.",
      );
    } finally {
      setBusy(false);
    }
  };

  const revoke = async () => {
    setBusy(true);
    try {
      const res = await fetch(`/api/interview/${sessionId}/share`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error();
      setShareUrl(null);
      setMessage("Enlace revocado.");
    } catch {
      setMessage("No se pudo revocar el enlace.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="glass-panel flex flex-col gap-3 rounded-2xl p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
        <Button
          variant="outline"
          render={
            // biome-ignore lint/a11y/useAnchorContent: el contenido lo pone Button
            <a href={`/api/interview/${sessionId}/report/pdf`} download />
          }
        >
          <IconDownload className="size-4" data-icon="inline-start" />
          Descargar PDF
        </Button>
        <Button onClick={() => void createShare()} disabled={busy}>
          <IconShare className="size-4" data-icon="inline-start" />
          {shareUrl ? "Copiar enlace" : "Compartir enlace"}
        </Button>
      </div>
      {shareUrl ? (
        <div className="flex items-center gap-2">
          <input
            readOnly
            value={shareUrl}
            className="min-w-0 flex-1 rounded-md border bg-background px-3 py-2 text-xs"
            onFocus={(e) => e.currentTarget.select()}
          />
          <Button
            size="icon"
            variant="outline"
            aria-label="Copiar enlace"
            onClick={() => void copy(shareUrl)}
          >
            {copied ? (
              <IconCheck className="size-4" />
            ) : (
              <IconCopy className="size-4" />
            )}
          </Button>
          <Button
            size="icon"
            variant="outline"
            aria-label="Revocar enlace"
            onClick={() => void revoke()}
            disabled={busy}
          >
            <IconLinkOff className="size-4" />
          </Button>
        </div>
      ) : null}
      {message || copied ? (
        <p className="text-center text-xs text-muted-foreground">
          {copied ? "Enlace copiado. " : ""}
          {message}
        </p>
      ) : null}
    </div>
  );
}
