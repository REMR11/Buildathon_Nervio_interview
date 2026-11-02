"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { createZodResolver } from "@/lib/validations/create-zod-resolver";
import { type ReplyValues, replySchema } from "@/lib/validations/support";

export function ReplyForm({
  ticketId,
  closed,
}: {
  ticketId: string;
  closed: boolean;
}) {
  const router = useRouter();
  const [sent, setSent] = useState(false);
  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ReplyValues>({
    resolver: createZodResolver(replySchema),
    defaultValues: { body: "" },
  });

  if (closed) {
    return (
      <p className="glass-panel rounded-2xl p-5 text-center text-sm text-muted-foreground">
        Este ticket está cerrado y no admite nuevas respuestas.
      </p>
    );
  }

  const onSubmit = async (values: ReplyValues) => {
    setSent(false);
    try {
      const res = await fetch(`/api/support/${ticketId}/replies`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError("root", {
          message: data.error ?? "No se pudo enviar la respuesta",
        });
        return;
      }
      reset({ body: "" });
      setSent(true);
      router.refresh();
    } catch {
      setError("root", { message: "Error de red. Intenta de nuevo." });
    }
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="glass-panel rounded-2xl p-6"
    >
      <FieldGroup>
        <Field data-invalid={!!errors.body}>
          <FieldLabel htmlFor="body">Responder</FieldLabel>
          <Textarea
            id="body"
            rows={4}
            aria-invalid={!!errors.body}
            disabled={isSubmitting}
            {...register("body")}
          />
          <FieldError errors={[errors.body]} />
        </Field>
        {errors.root && <FieldError>{errors.root.message}</FieldError>}
        {sent && (
          <output className="block text-sm text-emerald-400">
            Respuesta enviada.
          </output>
        )}
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? <Spinner data-icon="inline-start" /> : null}
          Enviar respuesta
        </Button>
      </FieldGroup>
    </form>
  );
}
