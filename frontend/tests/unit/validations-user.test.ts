import { describe, expect, it } from "vitest";
import { profileFormSchema, updateProfileSchema } from "@/lib/validations/user";

describe("updateProfileSchema", () => {
  it("acepta un nombre válido", () => {
    expect(
      updateProfileSchema.safeParse({ name: "Candidato Prueba" }).success,
    ).toBe(true);
  });

  it("acepta una URL de imagen o cadena vacía", () => {
    expect(
      updateProfileSchema.safeParse({ image: "https://cdn.test.example/a.png" })
        .success,
    ).toBe(true);
    expect(updateProfileSchema.safeParse({ image: "" }).success).toBe(true);
  });

  it("rechaza un cuerpo vacío", () => {
    const parsed = updateProfileSchema.safeParse({});
    expect(parsed.success).toBe(false);
  });

  it("rechaza campos extra (strict)", () => {
    expect(
      updateProfileSchema.safeParse({ name: "Ada", role: "admin" }).success,
    ).toBe(false);
  });

  it("rechaza un nombre de un carácter", () => {
    expect(updateProfileSchema.safeParse({ name: "A" }).success).toBe(false);
  });
});

describe("profileFormSchema", () => {
  it("exige nombre e imagen (aunque sea vacía)", () => {
    expect(
      profileFormSchema.safeParse({ name: "Ada", image: "" }).success,
    ).toBe(true);
    expect(profileFormSchema.safeParse({ name: "Ada" }).success).toBe(false);
  });
});
