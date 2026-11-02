import type { ReactNode } from "react";
import { AuthBackground } from "@/components/layout/auth-background";

export function StatusScreen({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <>
      <AuthBackground />
      <main className="relative z-10 flex min-h-screen flex-col items-center justify-center px-6 py-20">
        <div className="glass-panel glow-cyan flex w-full max-w-md flex-col items-center gap-4 rounded-2xl p-8 text-center">
          {eyebrow && (
            <span className="font-[family-name:var(--font-heading)] text-6xl font-bold gradient-text">
              {eyebrow}
            </span>
          )}
          <h1 className="font-[family-name:var(--font-heading)] text-2xl font-semibold text-foreground">
            {title}
          </h1>
          <p className="text-sm text-muted-foreground">{description}</p>
          {children && (
            <div className="mt-2 flex flex-col gap-3 sm:flex-row">
              {children}
            </div>
          )}
        </div>
      </main>
    </>
  );
}
