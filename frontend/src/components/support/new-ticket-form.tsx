"use client";

import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { createZodResolver } from "@/lib/validations/create-zod-resolver";
import {
  type CreateTicketValues,
  createTicketSchema,
  PRIORITY_LABELS,
  TICKET_PRIORITIES,
} from "@/lib/validations/support";

export function NewTicketForm() {
  const router = useRouter();
  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting, isSubmitSuccessful },
  } = useForm<CreateTicketValues>({
    resolver: createZodResolver(createTicketSchema),
    defaultValues: { subject: "", message: "", priority: "normal" },
  });

  const onSubmit = async (values: CreateTicketValues) => {
    try {
      const res = await fetch("/api/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError("root", {
          message: data.error ?? "No se pudo crear el ticket",
        });
        return;
      }
      router.push(`/support/${data.ticket.id}?created=1`);
      router.refresh();
    } catch {
      setError("root", { message: "Error de red. Intenta de nuevo." });
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <FieldGroup>
        <Field data-invalid={!!errors.subject}>
          <FieldLabel htmlFor="subject">Asunto</FieldLabel>
          <Input
            id="subject"
            placeholder="Ej.: No se generó mi reporte"
            aria-invalid={!!errors.subject}
            disabled={isSubmitting}
            {...register("subject")}
          />
          <FieldError errors={[errors.subject]} />
        </Field>
        <Field data-invalid={!!errors.priority}>
          <FieldLabel htmlFor="priority">Prioridad</FieldLabel>
          <Controller
            name="priority"
            control={control}
            render={({ field }) => (
              <Select
                id="priority"
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                disabled={isSubmitting}
              >
                {TICKET_PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {PRIORITY_LABELS[p]}
                  </option>
                ))}
              </Select>
            )}
          />
          <FieldError errors={[errors.priority]} />
        </Field>
        <Field data-invalid={!!errors.message}>
          <FieldLabel htmlFor="message">Describe el problema</FieldLabel>
          <Textarea
            id="message"
            rows={6}
            aria-invalid={!!errors.message}
            disabled={isSubmitting}
            {...register("message")}
          />
          <FieldError errors={[errors.message]} />
        </Field>
        {errors.root && <FieldError>{errors.root.message}</FieldError>}
        <Button type="submit" disabled={isSubmitting || isSubmitSuccessful}>
          {isSubmitting ? <Spinner data-icon="inline-start" /> : null}
          Enviar ticket
        </Button>
      </FieldGroup>
    </form>
  );
}
