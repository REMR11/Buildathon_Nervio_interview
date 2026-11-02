"use client";

import "./globals.css";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="es" className="dark">
      <body className="flex min-h-screen items-center justify-center bg-background p-6 text-foreground">
        <div className="glass-panel flex max-w-md flex-col items-center gap-4 rounded-2xl p-8 text-center">
          <h1 className="text-2xl font-semibold">Nervio no está disponible</h1>
          <p className="text-sm text-muted-foreground">
            Tuvimos un problema grave al cargar la aplicación. Intenta de nuevo
            en unos segundos.
          </p>
          <button
            type="button"
            onClick={() => reset()}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            Reintentar
          </button>
        </div>
      </body>
    </html>
  );
}
