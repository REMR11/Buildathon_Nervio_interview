"use client";

import Link from "next/link";
import { useEffect } from "react";
import { StatusScreen } from "@/components/layout/status-screen";
import { Button } from "@/components/ui/button";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <StatusScreen
      title="Algo salió mal"
      description="Ocurrió un error inesperado. Puedes intentarlo de nuevo o volver al inicio."
    >
      <Button onClick={() => reset()}>Reintentar</Button>
      <Button variant="outline" render={<Link href="/" />}>
        Volver al inicio
      </Button>
    </StatusScreen>
  );
}
