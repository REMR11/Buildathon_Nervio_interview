"use client";

import Link from "next/link";
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

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      setError("Ingresa un correo válido");
      return;
    }
    setPending(true);
    const { error: apiError } = await authClient.requestPasswordReset({
      email,
      redirectTo: "/reset-password",
    });
    setPending(false);
    if (apiError) {
      setError(
        apiError.status === 429
          ? "Demasiados intentos. Espera unos minutos e inténtalo de nuevo."
          : "No pudimos procesar la solicitud. Inténtalo de nuevo.",
      );
      return;
    }
    setSent(true);
  };

  if (sent) {
    return (
      <AuthCard
        title="Revisa tu correo"
        description={`Si existe una cuenta con ${email}, te enviamos un enlace para restablecer tu contraseña. Vence en 1 hora.`}
      >
        <Button render={<Link href="/login" />}>Volver a iniciar sesión</Button>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="¿Olvidaste tu contraseña?"
      description="Escribe tu correo y te enviaremos un enlace para crear una nueva"
    >
      <form onSubmit={onSubmit}>
        <FieldGroup>
          <Field data-invalid={!!error}>
            <FieldLabel htmlFor="email">Correo electrónico</FieldLabel>
            <Input
              id="email"
              type="email"
              placeholder="nombre@empresa.com"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-invalid={!!error}
            />
          </Field>
          {error && <FieldError>{error}</FieldError>}
          <Button type="submit" disabled={pending} className="w-full">
            {pending && <Spinner />}
            Enviar enlace
          </Button>
        </FieldGroup>
      </form>
      <p className="text-center text-sm text-muted-foreground">
        <Link href="/login" className="text-primary hover:underline">
          Volver a iniciar sesión
        </Link>
      </p>
    </AuthCard>
  );
}
