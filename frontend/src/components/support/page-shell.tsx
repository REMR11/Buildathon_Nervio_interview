import { AuthBackground } from "@/components/layout/auth-background";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";

export function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AuthBackground />
      <SiteHeader />
      <main className="relative z-10 mx-auto w-full max-w-4xl px-6 pt-32 pb-16">
        {children}
      </main>
      <SiteFooter />
    </>
  );
}
