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
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { createZodResolver } from "@/lib/validations/create-zod-resolver";
import {
  type ProfileFormValues,
  profileFormSchema,
} from "@/lib/validations/user";

export function ProfileForm({ initial }: { initial: ProfileFormValues }) {
  const router = useRouter();
  const [saved, setSaved] = useState(false);
  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<ProfileFormValues>({
    resolver: createZodResolver(profileFormSchema),
    defaultValues: initial,
  });

  const onSubmit = async (values: ProfileFormValues) => {
    setSaved(false);
    try {
      const res = await fetch("/api/users/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError("root", {
          message: data.error ?? "No se pudo guardar el perfil",
        });
        return;
      }
      reset({ name: data.user.name, image: data.user.image ?? "" });
      setSaved(true);
      router.refresh();
    } catch {
      setError("root", { message: "Error de red. Intenta de nuevo." });
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <FieldGroup>
        <Field data-invalid={!!errors.name}>
          <FieldLabel htmlFor="name">Nombre</FieldLabel>
          <Input id="name" aria-invalid={!!errors.name} {...register("name")} />
          <FieldError errors={[errors.name]} />
        </Field>
        <Field data-invalid={!!errors.image}>
          <FieldLabel htmlFor="image">URL de foto (opcional)</FieldLabel>
          <Input
            id="image"
            type="url"
            placeholder="https://..."
            aria-invalid={!!errors.image}
            {...register("image")}
          />
          <FieldError errors={[errors.image]} />
        </Field>
        {errors.root && <FieldError>{errors.root.message}</FieldError>}
        {saved && !isDirty && (
          <output className="block text-sm text-emerald-400">
            Perfil actualizado.
          </output>
        )}
        <Button type="submit" disabled={isSubmitting || !isDirty}>
          {isSubmitting ? <Spinner data-icon="inline-start" /> : null}
          Guardar cambios
        </Button>
      </FieldGroup>
    </form>
  );
}
