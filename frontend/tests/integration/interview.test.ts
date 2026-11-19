import { beforeEach, describe, expect, it } from "vitest";
import { POST as POST_END } from "@/app/api/interview/[sessionId]/end/route";
import { POST as POST_MESSAGE } from "@/app/api/interview/[sessionId]/messages/route";
import { GET as GET_SESSION } from "@/app/api/interview/[sessionId]/route";
import { POST as POST_SHARE } from "@/app/api/interview/[sessionId]/share/route";
import { GET as GET_REPORTS } from "@/app/api/interview/reports/route";
import { POST as POST_SCHEDULE } from "@/app/api/interview/schedule/route";
import { POST as POST_START } from "@/app/api/interview/start/route";
import { CV_MIME } from "@/lib/cv/extract";
import { prisma } from "@/lib/prisma";
import { FICTIONAL_CV_TEXT } from "../fixtures/cv";
import {
  createTestUser,
  jsonRequest,
  readJson,
  routeParams,
  signInAs,
} from "../setup/auth";
import { resetDatabase } from "../setup/db";

const setupBody = {
  role: "Frontend Engineer",
  candidateName: "Candidato Prueba",
  level: "mid",
  language: "es",
  interviewType: "tecnico",
  extraContext: "Perfil ficticio para pruebas de entrevista.",
};

describe("entrevistas y agenda", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it("POST start responde 401 sin sesión", async () => {
    const response = await POST_START(
      jsonRequest("http://localhost/api/interview/start", setupBody),
    );
    expect(response.status).toBe(401);
  });

  it("POST start responde 400 con datos inválidos", async () => {
    const user = await createTestUser();
    await signInAs(user);
    const response = await POST_START(
      jsonRequest("http://localhost/api/interview/start", { role: "x" }),
    );
    expect(response.status).toBe(400);
  });

  it("POST start responde 404 si el CV no es del usuario", async () => {
    const user = await createTestUser();
    await signInAs(user);
    const response = await POST_START(
      jsonRequest("http://localhost/api/interview/start", {
        ...setupBody,
        cvId: "11111111-1111-4111-8111-111111111111",
      }),
    );
    expect(response.status).toBe(404);
  });

  it("inicia una entrevista con preguntas mock (sin N8N ni ElevenLabs)", async () => {
    const user = await createTestUser();
    await signInAs(user);
    const started = await POST_START(
      jsonRequest("http://localhost/api/interview/start", setupBody),
    );
    expect(started.status).toBe(200);
    const body = await readJson<{
      sessionId: string;
      questions: unknown[];
      audioUrl: string | null;
    }>(started);
    expect(body.sessionId).toBeTruthy();
    expect(body.questions.length).toBeGreaterThan(0);
    expect(body.audioUrl).toBeNull();

    const session = await GET_SESSION(
      new Request(`http://localhost/api/interview/${body.sessionId}`),
      routeParams({ sessionId: body.sessionId }),
    );
    expect(session.status).toBe(200);
  });

  it("asocia un CV propio al iniciar", async () => {
    const user = await createTestUser();
    await signInAs(user);
    const cv = await prisma.candidateCv.create({
      data: {
        userId: user.id,
        fileName: "cv.pdf",
        mimeType: CV_MIME.pdf,
        sizeBytes: 120,
        extractedText: FICTIONAL_CV_TEXT,
      },
    });
    const started = await POST_START(
      jsonRequest("http://localhost/api/interview/start", {
        ...setupBody,
        cvId: cv.id,
      }),
    );
    expect(started.status).toBe(200);
    const body = await readJson<{ sessionId: string }>(started);
    const stored = await prisma.interviewSession.findUniqueOrThrow({
      where: { id: body.sessionId },
    });
    expect(stored.cvId).toBe(cv.id);
  });

  it("POST message 400/409 y GET session 404", async () => {
    const user = await createTestUser();
    await signInAs(user);
    const started = await POST_START(
      jsonRequest("http://localhost/api/interview/start", setupBody),
    );
    const { sessionId } = await readJson<{ sessionId: string }>(started);

    const invalid = await POST_MESSAGE(
      jsonRequest(`http://localhost/api/interview/${sessionId}/messages`, {
        text: "",
      }),
      routeParams({ sessionId }),
    );
    expect(invalid.status).toBe(400);

    const ok = await POST_MESSAGE(
      jsonRequest(`http://localhost/api/interview/${sessionId}/messages`, {
        role: "candidate",
        text: "Respuesta ficticia de prueba.",
      }),
      routeParams({ sessionId }),
    );
    expect(ok.status).toBe(200);

    const ended = await POST_END(
      jsonRequest(`http://localhost/api/interview/${sessionId}/end`, {
        reason: "time_limit",
        skipEvaluation: true,
      }),
      routeParams({ sessionId }),
    );
    expect(ended.status).toBe(200);

    const again = await POST_END(
      jsonRequest(`http://localhost/api/interview/${sessionId}/end`, {
        reason: "manual",
      }),
      routeParams({ sessionId }),
    );
    expect(again.status).toBe(409);

    const afterEnd = await POST_MESSAGE(
      jsonRequest(`http://localhost/api/interview/${sessionId}/messages`, {
        text: "tarde",
      }),
      routeParams({ sessionId }),
    );
    expect(afterEnd.status).toBe(409);

    const missing = await GET_SESSION(
      new Request(
        "http://localhost/api/interview/11111111-1111-4111-8111-111111111111",
      ),
      routeParams({ sessionId: "11111111-1111-4111-8111-111111111111" }),
    );
    expect(missing.status).toBe(404);
  });

  it("no comparte reporte si aún no está listo (409)", async () => {
    const user = await createTestUser();
    await signInAs(user);
    const started = await POST_START(
      jsonRequest("http://localhost/api/interview/start", setupBody),
    );
    const { sessionId } = await readJson<{ sessionId: string }>(started);
    const share = await POST_SHARE(
      jsonRequest(`http://localhost/api/interview/${sessionId}/share`, {}),
      routeParams({ sessionId }),
    );
    expect(share.status).toBe(409);
  });

  it("GET reports lista sesiones finalizadas del dueño", async () => {
    const user = await createTestUser();
    await signInAs(user);
    const started = await POST_START(
      jsonRequest("http://localhost/api/interview/start", setupBody),
    );
    const { sessionId } = await readJson<{ sessionId: string }>(started);
    await POST_END(
      jsonRequest(`http://localhost/api/interview/${sessionId}/end`, {
        skipEvaluation: true,
      }),
      routeParams({ sessionId }),
    );
    const reports = await GET_REPORTS();
    expect(reports.status).toBe(200);
    const body = await readJson<{ reports: { sessionId: string }[] }>(reports);
    expect(body.reports.map((item) => item.sessionId)).toContain(sessionId);
  });

  it("agenda una cita futura y rechaza una fecha pasada", async () => {
    const user = await createTestUser();
    await signInAs(user);
    const bad = await POST_SCHEDULE(
      jsonRequest("http://localhost/api/interview/schedule", {
        ...setupBody,
        scheduledAt: new Date(Date.now() - 60_000).toISOString(),
        reminderOffsetMinutes: 15,
      }),
    );
    expect(bad.status).toBe(400);

    const scheduledAt = new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString();
    const ok = await POST_SCHEDULE(
      jsonRequest("http://localhost/api/interview/schedule", {
        ...setupBody,
        scheduledAt,
        reminderOffsetMinutes: 60,
      }),
    );
    expect(ok.status).toBe(200);
    const body = await readJson<{ sessionId: string; emailSent: boolean }>(ok);
    expect(body.emailSent).toBe(false);
    const stored = await prisma.interviewSession.findUniqueOrThrow({
      where: { id: body.sessionId },
    });
    expect(stored.status).toBe("scheduled");
  });
});
