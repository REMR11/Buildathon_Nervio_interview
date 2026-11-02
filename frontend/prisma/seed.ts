/**
 * Seed de datos iniciales para Nervio (Fase 3 · Sprint 1).
 *
 * Crea usuarios de prueba con credenciales válidas usando la API servidor de
 * Better Auth (para que el hash de contraseña sea compatible con el login real)
 * y un conjunto de datos de dominio de ejemplo (una entrevista finalizada con
 * preguntas, respuestas, evaluación y una cita futura) para poder revisar el
 * historial, el reporte y la agenda sin tener que grabar una entrevista completa.
 *
 * Ejecutar:  pnpm db:seed         (o:  pnpm exec prisma db seed)
 * Requiere:  DATABASE_URL / POSTGRES_URL y BETTER_AUTH_SECRET definidos en .env
 *
 * Es idempotente: si los usuarios o la sesión de ejemplo ya existen, no los duplica.
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import pg from "pg";
import { PrismaClient } from "../src/generated/prisma/client";

function resolveDatabaseUrl(): string {
  const raw =
    process.env.POSTGRES_URL?.trim() ?? process.env.DATABASE_URL?.trim() ?? "";
  if (!raw) {
    throw new Error("POSTGRES_URL o DATABASE_URL no están definidos");
  }
  return raw.startsWith("jdbc:") ? raw.replace(/^jdbc:/, "") : raw;
}

const databaseUrl = resolveDatabaseUrl();
const useSupabaseSsl = databaseUrl.includes("supabase.com");
const pool = new pg.Pool({
  connectionString: databaseUrl,
  ...(useSupabaseSsl ? { ssl: { rejectUnauthorized: false } } : {}),
});
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
    autoSignIn: false,
  },
});

interface SeedUser {
  name: string;
  email: string;
  password: string;
  role?: "user" | "admin";
}

// Usuarios de prueba preconfigurados para la revisión de la Fase 3.
const SEED_USERS: SeedUser[] = [
  { name: "Candidata Demo", email: "demo@nervio.dev", password: "Nervio#2026" },
  { name: "Candidato QA", email: "qa@nervio.dev", password: "Nervio#2026" },
  {
    name: "Admin Nervio",
    email: "admin@nervio.dev",
    password: "Nervio#2026",
    role: "admin",
  },
];

async function ensureUser(user: SeedUser): Promise<string> {
  const id = await ensureUserAccount(user);
  // Rol preconfigurado (idempotente: solo actualiza si difiere).
  const role = user.role ?? "user";
  const { count } = await prisma.user.updateMany({
    where: { id, NOT: { role } },
    data: { role },
  });
  if (count) console.log(`✓ Rol "${role}" asignado a ${user.email}`);
  return id;
}

async function ensureUserAccount(user: SeedUser): Promise<string> {
  const existing = await prisma.user.findUnique({
    where: { email: user.email },
  });
  if (existing) {
    console.log(`• Usuario ya existe: ${user.email}`);
    return existing.id;
  }
  await auth.api.signUpEmail({
    body: { name: user.name, email: user.email, password: user.password },
  });
  const created = await prisma.user.findUnique({
    where: { email: user.email },
  });
  if (!created) throw new Error(`No se pudo crear el usuario ${user.email}`);
  console.log(
    `✓ Usuario creado: ${user.email}  (contraseña: ${user.password})`,
  );
  return created.id;
}

async function seedSampleInterview(userId: string): Promise<void> {
  const SEED_ROLE = "Frontend Developer (demo seed)";

  const already = await prisma.interviewSession.findFirst({
    where: { userId, role: SEED_ROLE },
    select: { id: true },
  });
  if (already) {
    console.log("• Entrevista de ejemplo ya existe, se omite.");
    await seedDemoTranscript(already.id);
    return;
  }

  const session = await prisma.interviewSession.create({
    data: {
      userId,
      interviewType: "tecnico",
      role: SEED_ROLE,
      level: "mid",
      stack: "React, Next.js, TypeScript, PostgreSQL",
      extraContext: "Candidato con dos años de experiencia construyendo SPAs.",
      stressMode: false,
      status: "ended",
      startedAt: new Date(Date.now() - 40 * 60 * 1000),
      endedAt: new Date(Date.now() - 10 * 60 * 1000),
    },
  });

  const q1 = await prisma.questions.create({
    data: {
      sessionId: session.id,
      questionText:
        "Cuéntame sobre un proyecto reciente con React y qué rol tuviste.",
      orderIndex: 1,
      isFollowup: false,
    },
  });
  const q2 = await prisma.questions.create({
    data: {
      sessionId: session.id,
      questionText:
        "¿Cómo manejas el estado del servidor frente al estado del cliente?",
      orderIndex: 2,
      isFollowup: false,
    },
  });

  await prisma.responses.createMany({
    data: [
      {
        sessionId: session.id,
        questionId: q1.id,
        responseText:
          "Lideré el frontend de un panel de métricas en Next.js, migrando a App Router y Server Components.",
      },
      {
        sessionId: session.id,
        questionId: q2.id,
        responseText:
          "Uso React Query para estado del servidor con cache e invalidación, y useState/Context solo para UI local.",
      },
    ],
  });

  await prisma.evaluations.create({
    data: {
      sessionId: session.id,
      scoreGlobal: 82,
      scoreClarity: 85,
      scoreKnowledge: 80,
      scoreConfidence: 78,
      scoreStructure: 84,
      strengths: JSON.stringify([
        "Respuestas estructuradas con ejemplos concretos",
        "Buen dominio del ecosistema React/Next.js",
      ]),
      weaknesses: JSON.stringify([
        "Profundizar en trade-offs de rendimiento",
        "Agregar métricas de impacto cuantificables",
      ]),
      recommendation:
        "Buen desempeño general. Sigue practicando respuestas con resultados medibles.",
    },
  });

  const scheduledAt = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
  await prisma.schedules.create({
    data: {
      sessionId: session.id,
      userId,
      scheduledAt,
      candidateName: "Candidata Demo",
      reminderOffsetMinutes: 60,
      reminderAt: new Date(scheduledAt.getTime() - 60 * 60 * 1000),
    },
  });

  await seedDemoTranscript(session.id);

  console.log(
    `✓ Entrevista de ejemplo creada (sessionId=${session.id}) con reporte y cita.`,
  );
}

const DEMO_TRANSCRIPT = [
  {
    question:
      "Cuéntame sobre un proyecto reciente con React y qué rol tuviste.",
    answer:
      "Lideré el frontend de un panel de métricas en Next.js, migrando a App Router y Server Components.",
    questionAt: 4,
    answerAt: 11,
    feedback:
      "Buena síntesis del rol y de la tecnología. Falta el impacto: no se menciona qué mejoró tras la migración.",
    score: 78,
    suggestion:
      "Agrega un resultado medible, por ejemplo: 'redujimos el tiempo de carga un 40%'.",
  },
  {
    question:
      "¿Cómo manejas el estado del servidor frente al estado del cliente?",
    answer:
      "Uso React Query para estado del servidor con cache e invalidación, y useState/Context solo para UI local.",
    questionAt: 38,
    answerAt: 45,
    feedback:
      "Distingue con claridad ambos tipos de estado y nombra herramientas adecuadas. Muestra criterio técnico.",
    score: 86,
    suggestion:
      "Menciona un trade-off, como cuándo evitarías Context por re-renders.",
  },
];

/** Idempotente: agrega transcripción y feedback por respuesta a la entrevista demo. */
async function seedDemoTranscript(sessionId: string): Promise<void> {
  const existing = await prisma.transcript_turns.count({
    where: { sessionId },
  });
  if (existing > 0) {
    console.log("• Transcripción de ejemplo ya existe, se omite.");
    return;
  }

  await prisma.transcript_turns.createMany({
    data: DEMO_TRANSCRIPT.flatMap((item, i) => [
      {
        sessionId,
        orderIndex: i * 2,
        role: "agent",
        message: item.question,
        timeInCallSecs: item.questionAt,
      },
      {
        sessionId,
        orderIndex: i * 2 + 1,
        role: "user",
        message: item.answer,
        timeInCallSecs: item.answerAt,
      },
    ]),
  });

  for (const item of DEMO_TRANSCRIPT) {
    await prisma.responses.updateMany({
      where: { sessionId, responseText: item.answer },
      data: {
        feedback: item.feedback,
        score: item.score,
        suggestion: item.suggestion,
      },
    });
  }

  console.log("✓ Transcripción y feedback por respuesta de ejemplo creados.");
}

interface SeedTicket {
  ownerEmail: string;
  subject: string;
  message: string;
  status: "open" | "in_progress" | "closed";
  priority: "low" | "normal" | "high";
  replies: { by: "owner" | "admin"; body: string }[];
}

// Tickets de soporte de ejemplo (idempotente por dueño + asunto).
const SEED_TICKETS: SeedTicket[] = [
  {
    ownerEmail: "demo@nervio.dev",
    subject: "No escucho al entrevistador en Firefox",
    message:
      "Al iniciar la entrevista técnica el micrófono funciona pero no escucho la voz del entrevistador. Uso Firefox 131 en Windows.",
    status: "in_progress",
    priority: "high",
    replies: [
      {
        by: "admin",
        body: "Gracias por reportarlo. ¿Puedes revisar que el sitio tenga permiso de reproducción automática de audio y volver a intentar?",
      },
      {
        by: "owner",
        body: "Lo activé y ahora sí se escucha, pero con algo de retraso.",
      },
    ],
  },
  {
    ownerEmail: "demo@nervio.dev",
    subject: "¿Puedo descargar el reporte en PDF?",
    message:
      "Quiero compartir mi reporte con un reclutador. ¿Hay forma de exportarlo?",
    status: "closed",
    priority: "low",
    replies: [
      {
        by: "admin",
        body: "Sí: en la página del reporte usa el botón «Descargar PDF» o «Compartir enlace». ¡Éxito!",
      },
    ],
  },
  {
    ownerEmail: "qa@nervio.dev",
    subject: "No me llegó el recordatorio de mi cita",
    message:
      "Agendé una práctica para mañana con recordatorio de 30 minutos, pero no recibí el correo de confirmación.",
    status: "open",
    priority: "normal",
    replies: [],
  },
];

async function seedSupportTickets(adminId: string): Promise<void> {
  for (const t of SEED_TICKETS) {
    const owner = await prisma.user.findUnique({
      where: { email: t.ownerEmail },
      select: { id: true },
    });
    if (!owner) continue;
    const exists = await prisma.supportTicket.findFirst({
      where: { userId: owner.id, subject: t.subject },
      select: { id: true },
    });
    if (exists) {
      console.log(`• Ticket ya existe: ${t.subject}`);
      continue;
    }
    await prisma.supportTicket.create({
      data: {
        userId: owner.id,
        subject: t.subject,
        message: t.message,
        status: t.status,
        priority: t.priority,
        closedAt: t.status === "closed" ? new Date() : null,
        replies: {
          create: t.replies.map((r, i) => ({
            authorId: r.by === "admin" ? adminId : owner.id,
            body: r.body,
            isStaff: r.by === "admin",
            createdAt: new Date(Date.now() - (t.replies.length - i) * 60_000),
          })),
        },
      },
    });
    console.log(`✓ Ticket de soporte creado: ${t.subject}`);
  }
}

async function main() {
  console.log("→ Sembrando datos de prueba de Nervio...");
  const firstUserId = await ensureUser(SEED_USERS[0]);
  let adminId = "";
  for (const user of SEED_USERS.slice(1)) {
    const id = await ensureUser(user);
    if (user.role === "admin") adminId = id;
  }
  await seedSampleInterview(firstUserId);
  if (adminId) await seedSupportTickets(adminId);
  console.log("✔ Seed completado.");
}

main()
  .catch((error) => {
    console.error("✗ Error en el seed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
