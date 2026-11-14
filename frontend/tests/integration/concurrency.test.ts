/**
 * Pruebas de concurrencia — Recursos limitados (Fase Final)
 *
 * Verifica que dos usuarios no puedan tomar el mismo recurso limitado simultáneamente.
 * Caso de prueba: Un usuario no puede iniciar múltiples entrevistas activas a la vez.
 */
import { beforeEach, describe, expect, it } from "vitest";
import { POST as startHandler } from "@/app/api/interview/start/route";
import { prisma } from "@/lib/prisma";
import { createTestUser, jsonRequest, signInAs } from "../setup/auth";
import { resetDatabase } from "../setup/db";

let testUserId: string;

beforeEach(async () => {
  await resetDatabase();

  // Crear usuario con helper
  const user = await createTestUser({
    name: "Test Concurrency",
    prefix: "concurrency",
  });
  testUserId = user.id;

  // Iniciar sesión (inyecta contexto de sesión para los tests)
  await signInAs(user);
});

describe("Concurrencia — Recursos limitados", () => {
  it("debe impedir que un usuario inicie dos entrevistas simultáneas", async () => {
    const payload = {
      role: "Backend Developer",
      candidateName: "Test Concurrency User",
      level: "mid",
      language: "es",
      interviewType: "tecnico",
      extraContext: "Desarrollador con experiencia en Node.js y Express",
      stack: "Node.js",
      cvId: null,
    };

    // Primera solicitud
    const res1 = await startHandler(
      jsonRequest("http://test/api/interview/start", payload),
    );
    expect(res1.status).toBe(200);
    const data1 = await res1.json();
    const sessionId1 = data1.sessionId;

    // Verificar que la primera sesión se creó
    const session1 = await prisma.interviewSession.findUnique({
      where: { id: sessionId1 },
    });
    expect(session1?.status).toBe("in_progress");

    // Segunda solicitud sin terminar la primera
    const res2 = await startHandler(
      jsonRequest("http://test/api/interview/start", payload),
    );

    // Debe rechazar porque ya hay una sesión activa
    expect(res2.status).toBe(409);
    const error = await res2.json();
    expect(error.error).toContain("entrevista en progreso");
    expect(error.activeSessionId).toBe(sessionId1);
  });

  it("debe permitir iniciar una nueva entrevista después de finalizar la anterior", async () => {
    const payload = {
      role: "Full Stack Developer",
      candidateName: "Test Concurrency User",
      level: "senior",
      language: "es",
      interviewType: "tecnico",
      extraContext: "Desarrollador full stack con experiencia en React y Node.js",
      stack: "React",
      cvId: null,
    };

    // Iniciar primera entrevista
    const res1 = await startHandler(
      jsonRequest("http://test/api/interview/start", payload),
    );
    expect(res1.status).toBe(200);
    const data1 = await res1.json();
    const sessionId1 = data1.sessionId;

    // Finalizar la primera entrevista
    await prisma.interviewSession.update({
      where: { id: sessionId1 },
      data: { status: "completed" },
    });

    // Iniciar segunda entrevista
    const res2 = await startHandler(
      jsonRequest("http://test/api/interview/start", payload),
    );

    // Debe permitir porque la primera ya terminó
    expect(res2.status).toBe(200);
    const data2 = await res2.json();
    expect(data2.sessionId).toBeTruthy();
    expect(data2.sessionId).not.toBe(sessionId1);

    // Verificar que ambas sesiones existen en BD
    const sessions = await prisma.interviewSession.findMany({
      where: { userId: testUserId },
    });
    expect(sessions).toHaveLength(2);
  });

  it("debe manejar correctamente race conditions con Promise.all", async () => {
    const payload = {
      role: "Full Stack Developer",
      candidateName: "Test Concurrency User",
      level: "junior",
      language: "es",
      interviewType: "tecnico",
      extraContext: "Desarrollador junior con conocimientos de JavaScript",
      stack: "JavaScript",
      cvId: null,
    };

    // Lanzar 3 solicitudes simultáneas con Promise.all (race condition real)
    const responses = await Promise.all([
      startHandler(jsonRequest("http://test/api/interview/start", payload)),
      startHandler(jsonRequest("http://test/api/interview/start", payload)),
      startHandler(jsonRequest("http://test/api/interview/start", payload)),
    ]);

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
      where: {
        userId: testUserId,
        status: "in_progress",
      },
    });
    expect(activeSessions).toHaveLength(1);
  });
});
