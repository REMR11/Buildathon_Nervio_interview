import type { Metadata } from "next";
import { AuthBackground } from "@/components/layout/auth-background";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { ProfileForm } from "@/components/profile/profile-form";
import { requireAuth } from "@/lib/auth-server";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Mi perfil · Nervio" };
export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const session = await requireAuth("/profile");
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      name: true,
      email: true,
      image: true,
      role: true,
      createdAt: true,
      _count: { select: { interviewSessions: true, schedules: true } },
    },
  });
  if (!user) return null;

  return (
    <>
      <AuthBackground />
      <SiteHeader />
      <main className="relative z-10 mx-auto w-full max-w-2xl px-6 pt-32 pb-16">
        <h1 className="font-[family-name:var(--font-heading)] text-3xl font-bold">
          Mi perfil
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {user.email} · rol <strong>{user.role}</strong> ·{" "}
          {user._count.interviewSessions} entrevistas · {user._count.schedules}{" "}
          citas
        </p>
        <div className="glass-panel mt-8 rounded-2xl p-8">
          <ProfileForm initial={{ name: user.name, image: user.image ?? "" }} />
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
