import { AuthBackground } from "@/components/layout/auth-background";
import { Spinner } from "@/components/ui/spinner";

export default function Loading() {
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
