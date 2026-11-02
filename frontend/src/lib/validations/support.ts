import { z } from "zod";

export const TICKET_STATUSES = ["open", "in_progress", "closed"] as const;
export const TICKET_PRIORITIES = ["low", "normal", "high"] as const;
export type TicketStatus = (typeof TICKET_STATUSES)[number];
export type TicketPriority = (typeof TICKET_PRIORITIES)[number];

export const STATUS_LABELS: Record<TicketStatus, string> = {
  open: "Abierto",
  in_progress: "En progreso",
  closed: "Cerrado",
};
export const PRIORITY_LABELS: Record<TicketPriority, string> = {
  low: "Baja",
  normal: "Normal",
  high: "Alta",
};

export const createTicketSchema = z.object({
  subject: z
    .string()
    .trim()
    .min(5, "El asunto debe tener al menos 5 caracteres")
    .max(120, "El asunto no puede superar 120 caracteres"),
  message: z
    .string()
    .trim()
    .min(10, "Describe el problema con al menos 10 caracteres")
    .max(5000, "El mensaje no puede superar 5000 caracteres"),
  priority: z.enum(TICKET_PRIORITIES, "Prioridad inválida"),
});

/**
 * Esquema de la API: `priority` es opcional y por defecto es "normal" (nivel
 * medio). Se acepta "medium" como alias de "normal".
 */
export const createTicketApiSchema = createTicketSchema.extend({
  priority: z.preprocess(
    (v) => (v === "medium" ? "normal" : v),
    z.enum(TICKET_PRIORITIES, "Prioridad inválida").default("normal"),
  ),
});

export const replySchema = z.object({
  body: z
    .string()
    .trim()
    .min(1, "La respuesta no puede estar vacía")
    .max(5000, "La respuesta no puede superar 5000 caracteres"),
});

export const updateTicketSchema = z
  .object({
    status: z.enum(TICKET_STATUSES, "Estado inválido").optional(),
    priority: z.enum(TICKET_PRIORITIES, "Prioridad inválida").optional(),
  })
  .strict()
  .refine((v) => v.status !== undefined || v.priority !== undefined, {
    message: "Indica status o priority",
  });

export type CreateTicketValues = z.infer<typeof createTicketSchema>;
export type ReplyValues = z.infer<typeof replySchema>;
