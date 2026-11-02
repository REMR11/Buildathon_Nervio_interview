import { z } from "zod";

export const updateProfileSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, "El nombre debe tener al menos 2 caracteres")
      .max(80, "El nombre no puede superar 80 caracteres")
      .optional(),
    image: z
      .union([z.url("La imagen debe ser una URL válida"), z.literal("")])
      .optional()
      .nullable(),
  })
  .strict()
  .refine((v) => v.name !== undefined || v.image !== undefined, {
    message: "No hay cambios para guardar",
  });

export const profileFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "El nombre debe tener al menos 2 caracteres")
    .max(80, "El nombre no puede superar 80 caracteres"),
  image: z.union([z.url("La imagen debe ser una URL válida"), z.literal("")]),
});

export type ProfileFormValues = z.infer<typeof profileFormSchema>;
