import { Suspense } from "react";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import { AuthBackground } from "@/components/layout/auth-background";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";

export default function Page() {
  return (
    <>
      <AuthBackground />
      <SiteHeader />
      <main className="relative z-10 flex min-h-screen flex-col items-center justify-center px-6 pt-20">
        <Suspense>
          <ForgotPasswordForm />
        </Suspense>
      </main>
      <SiteFooter />
    </>
  );
}
