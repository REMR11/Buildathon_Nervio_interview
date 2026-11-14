import { describe, expect, it } from "vitest";
import { loginSchema, registerSchema } from "@/lib/validations/auth";

describe("loginSchema", () => {
  it("acepta credenciales válidas", () => {
    const parsed = loginSchema.safeParse({
      email: "user@test.example",
      password: "secreto12",
    });
    expect(parsed.success).toBe(true);
  });

  it("rechaza un correo inválido", () => {
    const parsed = loginSchema.safeParse({
      email: "no-es-correo",
      password: "secreto12",
    });
    expect(parsed.success).toBe(false);
  });

  it("exige 8 caracteres de contraseña", () => {
    const parsed = loginSchema.safeParse({
      email: "user@test.example",
      password: "corta",
    });
    expect(parsed.success).toBe(false);
  });
});

describe("registerSchema", () => {
  const valid = {
    name: "Ada",
    email: "ada@test.example",
    password: "secreto12",
    confirmPassword: "secreto12",
  };

  it("acepta un registro coherente", () => {
    expect(registerSchema.safeParse(valid).success).toBe(true);
  });

  it("rechaza si las contraseñas no coinciden", () => {
    const parsed = registerSchema.safeParse({
      ...valid,
      confirmPassword: "otra-clave",
    });
    expect(parsed.success).toBe(false);
    if (parsed.success) return;
    expect(parsed.error.issues[0]?.path).toContain("confirmPassword");
  });

  it("exige un nombre de al menos 2 caracteres", () => {
    expect(registerSchema.safeParse({ ...valid, name: "A" }).success).toBe(
      false,
    );
  });
});
