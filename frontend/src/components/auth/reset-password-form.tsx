"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { AuthCard } from "@/components/auth/auth-card";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { authClient } from "@/lib/auth-client";

export function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const linkError = searchParams.get("error");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!token || linkError) {
    return (
      <AuthCard
        title="Enlace inválido o vencido"
        description="Solicita un nuevo enlace para restablecer tu contraseña."
      >
        <Button render={<Link href="/forgot-password" />}>
          Solicitar nuevo enlace
        </Button>
      </AuthCard>
    );
  }

  if (done) {
    return (
      <AuthCard
        title="Contraseña actualizada"
        description="Ya puedes iniciar sesión con tu nueva contraseña."
      >
        <Button onClick={() => router.push("/login")}>Iniciar sesión</Button>
      </AuthCard>
    );
  }

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres");
      return;
    }
    if (password !== confirm) {
      setError("Las contraseñas no coinciden");
      return;
    }
    setPending(true);
    const { error: apiError } = await authClient.resetPassword({
      newPassword: password,
      token,
    });
    setPending(false);
    if (apiError) {
      setError(
        apiError.status === 429
          ? "Demasiados intentos. Espera unos minutos."
          : "El enlace es inválido o venció. Solicita uno nuevo.",
      );
      return;
    }
    setDone(true);
  };

  return (
    <AuthCard
      title="Crea una nueva contraseña"
      description="Usa al menos 8 caracteres"
    >
      <form onSubmit={onSubmit}>
        <FieldGroup>
          <Field data-invalid={!!error}>
            <FieldLabel htmlFor="password">Nueva contraseña</FieldLabel>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </Field>
          <Field data-invalid={!!error}>
            <FieldLabel htmlFor="confirm">Confirmar contraseña</FieldLabel>
            <Input
              id="confirm"
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
          </Field>
          {error && <FieldError>{error}</FieldError>}
          <Button type="submit" disabled={pending} className="w-full">
            {pending && <Spinner />}
            Guardar contraseña
          </Button>
        </FieldGroup>
      </form>
    </AuthCard>
  );
}
