import { AuthBackground } from "@/components/layout/auth-background";
import { Spinner } from "@/components/ui/spinner";

/**
 * Pantalla de carga compartida. Se usa como `loading.tsx` solo en segmentos que
 * no llaman a `notFound()`: un boundary de carga envía la respuesta en streaming
 * con status 200 antes de que la página pueda devolver 404.
 */
export function PageLoading() {
  return (
    <>
      <AuthBackground />
      <main className="relative z-10 flex min-h-screen flex-col items-center justify-center gap-4 px-6">
        <Spinner className="size-10 text-primary" />
        <p className="font-[family-name:var(--font-heading)] text-lg gradient-text">
          Cargando Nervio…
        </p>
      </main>
    </>
  );
}
