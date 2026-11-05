import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { cookieHeaderFromSetCookie, setSessionCookie } from "./request-context";

export const TEST_PASSWORD = "TestPass#2026";

export interface TestUser {
  id: string;
  email: string;
  name: string;
  password: string;
  role: string;
}

function uniqueEmail(prefix: string) {
  return `${prefix}-${crypto.randomUUID()}@test.example`;
}

export async function createTestUser(options?: {
  role?: "user" | "admin";
  banned?: boolean;
  name?: string;
  prefix?: string;
}): Promise<TestUser> {
  const email = uniqueEmail(options?.prefix ?? "user");
  const name = options?.name ?? "Usuario de prueba";
  await auth.api.signUpEmail({
    body: { name, email, password: TEST_PASSWORD },
  });
  const created = await prisma.user.findUniqueOrThrow({ where: { email } });
  const role = options?.role ?? "user";
  const banned = options?.banned ?? false;
  if (role !== (created.role ?? "user") || banned) {
    await prisma.user.update({
      where: { id: created.id },
      data: { role, banned },
    });
  }
  return {
    id: created.id,
    email,
    name,
    password: TEST_PASSWORD,
    role,
  };
}

export async function signInAs(user: { email: string; password: string }) {
  const response = await auth.api.signInEmail({
    body: { email: user.email, password: user.password },
    asResponse: true,
  });
  const setCookie =
    typeof response.headers.getSetCookie === "function"
      ? response.headers.getSetCookie()
      : [response.headers.get("set-cookie") ?? ""];
  const cookie = cookieHeaderFromSetCookie(setCookie.filter(Boolean));
  if (!cookie) {
    throw new Error("Better Auth no devolvió cookie de sesión en el test");
  }
  setSessionCookie(cookie);
  return cookie;
}

export async function signOut() {
  setSessionCookie("");
}

export function jsonRequest(
  url: string,
  body: unknown,
  init?: RequestInit,
): Request {
  return new Request(url, {
    method: init?.method ?? "POST",
    headers: {
      "content-type": "application/json",
      ...(init?.headers ?? {}),
    },
    body: JSON.stringify(body),
    ...init,
  });
}

export function routeParams<T extends Record<string, string>>(params: T) {
  return { params: Promise.resolve(params) };
}

export async function readJson<T = Record<string, unknown>>(
  response: Response,
) {
  return (await response.json()) as T;
}
