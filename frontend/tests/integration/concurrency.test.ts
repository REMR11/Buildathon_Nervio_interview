/**
 * Pruebas de concurrencia — Recursos limitados (Fase Final)
 *
 * Verifica que dos usuarios no puedan tomar el mismo recurso limitado simultáneamente.
 * Caso de prueba: Un usuario no puede iniciar múltiples entrevistas activas a la vez.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { POST as signInHandler } from "@/app/api/auth/sign-in/route";
import { POST as signUpHandler } from "@/app/api/auth/sign-up/route";
import { POST as startHandler } from "@/app/api/interview/start/route";
import { prisma } from "@/lib/prisma";

const testEmail = "concurrency@test.example";
const testPassword = "Test#Concurrency2026";
let testUserId: string;
let testCookie: string;

beforeAll(async () => {
  // Limpiar datos previos
  await prisma.user.deleteMany({ where: { email: testEmail } });

  // Crear usuario
  const signUpReq = new Request("http://test/api/auth/sign-up", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      name: "Test Concurrency",
      email: testEmail,
      password: testPassword,
    }),
  });
  await signUpHandler(signUpReq);

  // Iniciar sesión
  const signInReq = new Request("http://test/api/auth/sign-in", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: testEmail, password: testPassword }),
  });
  const signInRes = await signInHandler(signInReq);
  const cookies = signInRes.headers.getSetCookie();
  testCookie =
    cookies.find((c) => c.startsWith("better-auth.session_token=")) ?? "";

  const user = await prisma.user.findUnique({ where: { email: testEmail } });
  if (!user) throw new Error("User not found after signup");
  testUserId = user.id;
});

afterAll(async () => {
  // Limpiar: eliminar todas las sesiones de prueba y el usuario
  await prisma.interviewSession.deleteMany({ where: { userId: testUserId } });
  await prisma.user.delete({ where: { id: testUserId } }).catch(() => {});
});

describe("Concurrencia — Recursos limitados", () => {
  it("debe impedir que un usuario inicie dos entrevistas simultáneas", async () => {
    // Contexto: Un usuario solo puede tener una sesión de entrevista "in_progress" a la vez.
    // Esta es la restricción de negocio que protege un recurso limitado.

    const payload = {
      interviewType: "behavioral",
      role: "Backend Developer",
      level: "mid",
      stack: "Node.js",
      cvText: null,
      cvId: null,
      stressMode: false,
    };

    // Primera solicitud: debe iniciar exitosamente
    const req1 = new Request("http://test/api/interview/start", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: testCookie,
      },
      body: JSON.stringify(payload),
    });
    const res1 = await startHandler(req1);
    expect(res1.status).toBe(200);
    const data1 = await res1.json();
    const sessionId1 = data1.sessionId;
    expect(sessionId1).toBeDefined();

    // Verificar que la sesión está "in_progress"
    const session1 = await prisma.interviewSession.findUnique({
      where: { id: sessionId1 },
    });
    expect(session1?.status).toBe("in_progress");

    // Segunda solicitud simultánea: debe rechazarse (409 Conflict)
    const req2 = new Request("http://test/api/interview/start", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: testCookie,
      },
      body: JSON.stringify(payload),
    });
    const res2 = await startHandler(req2);

    // El sistema debe rechazar la segunda entrevista porque ya hay una activa
    expect(res2.status).toBe(409);
    const data2 = await res2.json();
    expect(data2.error).toContain("entrevista en progreso");

    // Verificar que solo existe una sesión activa en la BD
    const activeSessions = await prisma.interviewSession.findMany({
      where: { userId: testUserId, status: "in_progress" },
    });
    expect(activeSessions).toHaveLength(1);
    expect(activeSessions[0].id).toBe(sessionId1);
  });

  it("debe permitir iniciar una nueva entrevista después de finalizar la anterior", async () => {
    // Limpiar sesiones previas
    await prisma.interviewSession.deleteMany({ where: { userId: testUserId } });

    const payload = {
      interviewType: "technical",
      role: "Frontend Developer",
      level: "senior",
      stack: "React",
      cvText: null,
      cvId: null,
      stressMode: false,
    };

    // Primera entrevista
    const req1 = new Request("http://test/api/interview/start", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: testCookie,
      },
      body: JSON.stringify(payload),
    });
    const res1 = await startHandler(req1);
    expect(res1.status).toBe(200);
    const data1 = await res1.json();
    const sessionId1 = data1.sessionId;

    // Finalizar la primera entrevista manualmente en la BD (simular end)
    await prisma.interviewSession.update({
      where: { id: sessionId1 },
      data: { status: "completed", endedAt: new Date() },
    });

    // Segunda entrevista: ahora debe permitirse (200)
    const req2 = new Request("http://test/api/interview/start", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: testCookie,
      },
      body: JSON.stringify(payload),
    });
    const res2 = await startHandler(req2);
    expect(res2.status).toBe(200);
    const data2 = await res2.json();
    expect(data2.sessionId).toBeDefined();
    expect(data2.sessionId).not.toBe(sessionId1);

    // Verificar que ahora hay dos sesiones, pero solo una "in_progress"
    const allSessions = await prisma.interviewSession.findMany({
      where: { userId: testUserId },
    });
    expect(allSessions).toHaveLength(2);
    const inProgress = allSessions.filter((s) => s.status === "in_progress");
    expect(inProgress).toHaveLength(1);
    expect(inProgress[0].id).toBe(data2.sessionId);
  });

  it("debe manejar correctamente race conditions con Promise.all", async () => {
    // Limpiar sesiones previas
    await prisma.interviewSession.deleteMany({ where: { userId: testUserId } });

    const payload = {
      interviewType: "mixed",
      role: "Full Stack Developer",
      level: "junior",
      stack: "JavaScript",
      cvText: null,
      cvId: null,
      stressMode: false,
    };

    // Lanzar 3 solicitudes simultáneas con Promise.all (race condition real)
    const requests = Array.from(
      { length: 3 },
      () =>
        new Request("http://test/api/interview/start", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            cookie: testCookie,
          },
          body: JSON.stringify(payload),
        }),
    );

    const responses = await Promise.all(
      requests.map((req) => startHandler(req)),
    );

    // Verificar códigos de respuesta
    const statuses = await Promise.all(
      responses.map(async (res) => ({
        status: res.status,
        data: await res.json(),
      })),
    );

    // Solo UNA debe tener éxito (200), las demás deben ser 409
    const successful = statuses.filter((s) => s.status === 200);
    const conflicts = statuses.filter((s) => s.status === 409);

    expect(successful).toHaveLength(1);
    expect(conflicts.length).toBeGreaterThanOrEqual(2);

    // Verificar que solo hay una sesión activa en la BD
    const activeSessions = await prisma.interviewSession.findMany({
      where: { userId: testUserId, status: "in_progress" },
    });
    expect(activeSessions).toHaveLength(1);
  });
});
