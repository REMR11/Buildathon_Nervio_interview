import { describe, expect, it } from "vitest";
import {
  createTicketApiSchema,
  createTicketSchema,
  replySchema,
  updateTicketSchema,
} from "@/lib/validations/support";

describe("createTicketSchema", () => {
  it("acepta un ticket válido", () => {
    expect(
      createTicketSchema.safeParse({
        subject: "No arranca la entrevista",
        message: "Al pulsar iniciar no ocurre nada visible.",
        priority: "high",
      }).success,
    ).toBe(true);
  });

  it("rechaza un asunto corto", () => {
    expect(
      createTicketSchema.safeParse({
        subject: "Hey",
        message: "Al pulsar iniciar no ocurre nada visible.",
        priority: "low",
      }).success,
    ).toBe(false);
  });
});

describe("createTicketApiSchema", () => {
  it("usa priority normal por defecto", () => {
    const parsed = createTicketApiSchema.safeParse({
      subject: "Error al subir CV",
      message: "El formulario no acepta el archivo PDF.",
    });
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data.priority).toBe("normal");
  });

  it("traduce medium a normal", () => {
    const parsed = createTicketApiSchema.safeParse({
      subject: "Error al subir CV",
      message: "El formulario no acepta el archivo PDF.",
      priority: "medium",
    });
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data.priority).toBe("normal");
  });
});

describe("replySchema", () => {
  it("rechaza un cuerpo vacío", () => {
    expect(replySchema.safeParse({ body: "   " }).success).toBe(false);
  });

  it("acepta una respuesta con texto", () => {
    expect(replySchema.safeParse({ body: "Revisamos el caso." }).success).toBe(
      true,
    );
  });
});

describe("updateTicketSchema", () => {
  it("exige status o priority", () => {
    expect(updateTicketSchema.safeParse({}).success).toBe(false);
    expect(updateTicketSchema.safeParse({ status: "closed" }).success).toBe(
      true,
    );
  });

  it("rechaza un estado desconocido", () => {
    expect(updateTicketSchema.safeParse({ status: "done" }).success).toBe(
      false,
    );
  });
});
