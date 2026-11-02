/**
 * Datos de demo adicionales para demo@nervio.dev (idempotente).
 *
 * - 4 entrevistas finalizadas (distintos roles, tipos y fechas) con
 *   transcripción en español, evaluación y feedback por respuesta.
 * - 1 entrevista agendada próxima (se re-programa si ya quedó en el pasado).
 *
 * No se adjunta grabación: no inventamos audios. Las conversaciones reales
 * del agente en ElevenLabs ya no tienen audio disponible (retención vencida),
 * así que `elevenlabsConversationId` y `recordings` quedan vacíos.
 */
import type { PrismaClient } from "../src/generated/prisma/client";

interface DemoTurn {
  question: string;
  answer: string;
  feedback: string;
  score: number;
  suggestion: string;
}

interface DemoInterview {
  key: string;
  role: string;
  interviewType: "hr" | "tecnico" | "no_tecnico" | "agresivo";
  level: "junior" | "mid" | "senior";
  stack: string | null;
  daysAgo: number;
  durationMin: number;
  scores: {
    global: number;
    clarity: number;
    knowledge: number;
    confidence: number;
    structure: number;
  };
  strengths: string[];
  weaknesses: string[];
  recommendation: string;
  turns: DemoTurn[];
}

const DAY_MS = 24 * 60 * 60 * 1000;

const DEMO_INTERVIEWS: DemoInterview[] = [
  {
    key: "backend-node",
    role: "Backend Developer Node.js",
    interviewType: "tecnico",
    level: "mid",
    stack: "Node.js, NestJS, PostgreSQL, Redis",
    daysAgo: 21,
    durationMin: 18,
    scores: {
      global: 74,
      clarity: 76,
      knowledge: 78,
      confidence: 68,
      structure: 72,
    },
    strengths: [
      "Conoce bien índices y planes de ejecución en PostgreSQL",
      "Explica la idempotencia con un caso real de pagos",
    ],
    weaknesses: [
      "Respuestas largas sin conclusión clara",
      "Poca mención de observabilidad (logs, métricas, trazas)",
    ],
    recommendation:
      "Buen fondo técnico. Practica el formato problema → decisión → resultado y cierra cada respuesta con una frase de impacto.",
    turns: [
      {
        question:
          "Diseña un endpoint para registrar pagos que pueda recibir el mismo webhook varias veces. ¿Cómo evitas duplicados?",
        answer:
          "Usaría una clave de idempotencia que manda el proveedor. La guardo con un índice único en la tabla de pagos y, si llega repetida, devuelvo la respuesta que ya había guardado en lugar de procesarla otra vez.",
        feedback:
          "Correcto y concreto: índice único más respuesta almacenada es la solución estándar.",
        score: 84,
        suggestion:
          "Menciona qué pasa si dos peticiones llegan a la vez (transacción o bloqueo).",
      },
      {
        question:
          "Una consulta de reportes tarda ocho segundos en producción. ¿Cuáles son tus primeros pasos?",
        answer:
          "Primero corro EXPLAIN ANALYZE para ver si hace un seq scan. Luego reviso si falta un índice compuesto por las columnas del filtro y, si el reporte no necesita datos en tiempo real, lo cacheo en Redis unos minutos.",
        feedback:
          "Buen orden de diagnóstico, de la medición a la solución. Muestra criterio.",
        score: 80,
        suggestion: "Agrega cómo verificarías la mejora (p95 antes y después).",
      },
      {
        question:
          "Cuéntame de un incidente en producción que te tocó resolver.",
        answer:
          "Eh… una vez se cayó una cola de trabajos, bueno, no se cayó, se llenó, y los correos no salían, entonces revisamos, eh, los workers y había uno bloqueado, y lo reiniciamos, y después pusimos un timeout.",
        feedback:
          "La historia es real pero desordenada y con muletillas; cuesta seguir la causa raíz.",
        score: 58,
        suggestion:
          "Usa STAR: situación (cola llena), acción (diagnóstico y timeout), resultado (cero bloqueos desde entonces).",
      },
    ],
  },
  {
    key: "hr-product",
    role: "Product Designer",
    interviewType: "hr",
    level: "junior",
    stack: null,
    daysAgo: 14,
    durationMin: 12,
    scores: {
      global: 81,
      clarity: 84,
      knowledge: 76,
      confidence: 80,
      structure: 83,
    },
    strengths: [
      "Comunicación cálida y clara",
      "Conecta su motivación con la misión de la empresa",
    ],
    weaknesses: [
      "Expectativa salarial sin rango definido",
      "Pocos ejemplos de trabajo en equipo con conflicto",
    ],
    recommendation:
      "Muy buena primera impresión. Prepara un rango salarial investigado y una historia de desacuerdo resuelto con un compañero.",
    turns: [
      {
        question: "Preséntate y cuéntame por qué te interesa este puesto.",
        answer:
          "Soy diseñadora con un año de experiencia en apps de salud. Me interesa este puesto porque su producto ayuda a pymes a ordenar sus finanzas y yo crecí viendo a mi mamá llevar las cuentas de su tienda en un cuaderno.",
        feedback:
          "Presentación breve y una motivación personal auténtica que conecta con el producto.",
        score: 90,
        suggestion:
          "Cierra con una habilidad concreta que aportarías el primer mes.",
      },
      {
        question:
          "Háblame de una vez que no estuviste de acuerdo con una decisión del equipo.",
        answer:
          "Mmm, la verdad casi siempre estamos de acuerdo. Una vez propuse otro color para un botón y al final se quedó el que ya estaba.",
        feedback:
          "Ejemplo poco relevante; no muestra cómo gestionas un desacuerdo real.",
        score: 62,
        suggestion:
          "Elige un caso con impacto (alcance, prioridad, usuario) y explica cómo argumentaste con datos.",
      },
      {
        question: "¿Cuál es tu expectativa salarial?",
        answer:
          "Estoy abierta a escuchar la propuesta de ustedes, lo importante para mí es aprender.",
        feedback:
          "Respuesta prudente, pero evita el tema y puede jugar en tu contra en la negociación.",
        score: 70,
        suggestion:
          "Da un rango basado en el mercado: 'Según mi investigación, entre X y Y, flexible según beneficios'.",
      },
    ],
  },
  {
    key: "data-analyst",
    role: "Data Analyst",
    interviewType: "no_tecnico",
    level: "mid",
    stack: "SQL, Python, Power BI",
    daysAgo: 7,
    durationMin: 15,
    scores: {
      global: 88,
      clarity: 90,
      knowledge: 86,
      confidence: 87,
      structure: 89,
    },
    strengths: [
      "Traduce análisis a decisiones de negocio",
      "Usa cifras concretas en cada ejemplo",
    ],
    weaknesses: ["Podría ser más breve en la introducción"],
    recommendation:
      "Excelente desempeño. Estás lista para entrevistas reales; enfócate en acortar la introducción a 60 segundos.",
    turns: [
      {
        question:
          "Cuéntame de un análisis que haya cambiado una decisión importante.",
        answer:
          "En una cadena de farmacias analicé las devoluciones por sucursal y vi que el 70% venía de un solo proveedor. Lo presenté con un tablero en Power BI y compras renegoció el contrato; las devoluciones bajaron un 35% en un trimestre.",
        feedback:
          "Respuesta modelo: contexto, hallazgo, acción y resultado cuantificado.",
        score: 94,
        suggestion:
          "Perfecto; podrías mencionar cómo validaste el dato antes de presentarlo.",
      },
      {
        question:
          "¿Cómo explicarías un resultado estadístico a alguien sin formación técnica?",
        answer:
          "Evito términos como p-valor. Uso una comparación cotidiana y una sola gráfica, y siempre termino con qué decisión recomiendo tomar.",
        feedback: "Clara y orientada a la audiencia. Muy buena estructura.",
        score: 88,
        suggestion:
          "Ilustra con un ejemplo real de una presentación que hiciste.",
      },
    ],
  },
  {
    key: "fullstack-stress",
    role: "Full Stack Developer",
    interviewType: "agresivo",
    level: "senior",
    stack: "TypeScript, Next.js, AWS",
    daysAgo: 3,
    durationMin: 20,
    scores: {
      global: 69,
      clarity: 70,
      knowledge: 82,
      confidence: 55,
      structure: 66,
    },
    strengths: [
      "Conocimiento técnico sólido de arquitectura en AWS",
      "Mantiene la cortesía bajo presión",
    ],
    weaknesses: [
      "Se nota inseguridad cuando el entrevistador interrumpe",
      "Pausas largas antes de responder preguntas incómodas",
    ],
    recommendation:
      "El conocimiento está; falta seguridad bajo presión. Repite el modo estrés y practica respuestas puente ('Buena pregunta, lo veo así…').",
    turns: [
      {
        question:
          "Tu CV dice senior, pero solo has trabajado en una empresa. ¿Por qué debería creer que eres senior?",
        answer:
          "Eh… bueno, es cierto que fue una sola empresa, pero ahí pasé por tres productos distintos y lideré la migración a AWS de un equipo de seis personas.",
        feedback:
          "El contenido es bueno, pero el arranque titubeante resta fuerza ante una pregunta desafiante.",
        score: 66,
        suggestion:
          "Empieza con la afirmación: 'Lideré tres productos y una migración a AWS con seis personas; eso es seniority'.",
      },
      {
        question:
          "Si tu sistema se cae un viernes a las once de la noche, ¿qué haces en los primeros diez minutos?",
        answer:
          "Reviso alertas y dashboards, confirmo el alcance, comunico en el canal de incidentes y, si el último deploy es sospechoso, hago rollback antes de investigar a fondo.",
        feedback:
          "Excelente prioridad: mitigar primero y comunicar. Respuesta de nivel senior.",
        score: 86,
        suggestion: "Menciona el postmortem sin culpables al final.",
      },
      {
        question: "Esa respuesta suena de manual. ¿Algo más original?",
        answer: "…Pues… no sé, creo que eso es lo que haría.",
        feedback:
          "La presión te hizo retroceder; una respuesta sólida no necesita disculpas.",
        score: 50,
        suggestion:
          "Defiende tu respuesta con un caso real: 'Es lo que hice en el incidente de marzo y redujimos el downtime a 12 minutos'.",
      },
    ],
  },
];

async function seedOneInterview(
  prisma: PrismaClient,
  userId: string,
  demo: DemoInterview,
): Promise<void> {
  const marker = `[demo:${demo.key}]`;
  const exists = await prisma.interviewSession.findFirst({
    where: { userId, extraContext: { startsWith: marker } },
    select: { id: true },
  });
  if (exists) {
    console.log(`• Entrevista demo ya existe: ${demo.role}`);
    return;
  }

  const endedAt = new Date(Date.now() - demo.daysAgo * DAY_MS);
  const startedAt = new Date(endedAt.getTime() - demo.durationMin * 60_000);

  const session = await prisma.interviewSession.create({
    data: {
      userId,
      interviewType: demo.interviewType,
      role: demo.role,
      level: demo.level,
      stack: demo.stack,
      extraContext: `${marker} Práctica de demo para Nervio.`,
      stressMode: demo.interviewType === "agresivo",
      status: "ended",
      startedAt,
      endedAt,
      createdAt: startedAt,
    },
  });

  const step = Math.floor(
    (demo.durationMin * 60) / (demo.turns.length * 2 + 1),
  );
  for (const [i, turn] of demo.turns.entries()) {
    const question = await prisma.questions.create({
      data: {
        sessionId: session.id,
        questionText: turn.question,
        orderIndex: i + 1,
        createdAt: startedAt,
      },
    });
    await prisma.responses.create({
      data: {
        sessionId: session.id,
        questionId: question.id,
        responseText: turn.answer,
        feedback: turn.feedback,
        score: turn.score,
        suggestion: turn.suggestion,
        fillerWordsDetected: /\b(eh|mmm)\b|…/i.test(turn.answer),
        longPauseDetected: turn.answer.startsWith("…"),
        createdAt: startedAt,
      },
    });
  }

  await prisma.transcript_turns.createMany({
    data: demo.turns.flatMap((turn, i) => [
      {
        sessionId: session.id,
        orderIndex: i * 2,
        role: "agent",
        message: turn.question,
        timeInCallSecs: step * (i * 2 + 1),
      },
      {
        sessionId: session.id,
        orderIndex: i * 2 + 1,
        role: "user",
        message: turn.answer,
        timeInCallSecs: step * (i * 2 + 2),
      },
    ]),
  });

  await prisma.evaluations.create({
    data: {
      sessionId: session.id,
      scoreGlobal: demo.scores.global,
      scoreClarity: demo.scores.clarity,
      scoreKnowledge: demo.scores.knowledge,
      scoreConfidence: demo.scores.confidence,
      scoreStructure: demo.scores.structure,
      strengths: JSON.stringify(demo.strengths),
      weaknesses: JSON.stringify(demo.weaknesses),
      recommendation: demo.recommendation,
      createdAt: endedAt,
    },
  });

  console.log(
    `✓ Entrevista demo creada: ${demo.role} (hace ${demo.daysAgo} días)`,
  );
}

const UPCOMING_MARKER = "[demo:upcoming]";

/** Entrevista agendada próxima; si ya pasó, se re-programa a +3 días. */
async function seedUpcomingSchedule(
  prisma: PrismaClient,
  userId: string,
): Promise<void> {
  const scheduledAt = new Date(Date.now() + 3 * DAY_MS);
  scheduledAt.setUTCHours(16, 0, 0, 0); // 10:00 en El Salvador (UTC-6)
  const reminderOffsetMinutes = 60;
  const reminderAt = new Date(
    scheduledAt.getTime() - reminderOffsetMinutes * 60_000,
  );

  const existing = await prisma.interviewSession.findFirst({
    where: { userId, extraContext: { startsWith: UPCOMING_MARKER } },
    select: {
      id: true,
      schedules: { select: { id: true, scheduledAt: true } },
    },
  });

  if (existing) {
    const schedule = existing.schedules[0];
    if (schedule && schedule.scheduledAt.getTime() > Date.now()) {
      console.log("• Cita demo próxima ya existe.");
      return;
    }
    if (schedule) {
      await prisma.schedules.update({
        where: { id: schedule.id },
        data: { scheduledAt, reminderAt },
      });
      console.log("✓ Cita demo re-programada a +3 días.");
      return;
    }
  }

  const session =
    existing ??
    (await prisma.interviewSession.create({
      data: {
        userId,
        interviewType: "tecnico",
        role: "Frontend Developer React",
        level: "senior",
        stack: "React, Next.js, Testing Library",
        extraContext: `${UPCOMING_MARKER} Práctica final antes de la entrevista real.`,
        status: "scheduled",
      },
      select: { id: true },
    }));

  await prisma.schedules.create({
    data: {
      sessionId: session.id,
      userId,
      scheduledAt,
      candidateName: "Candidata Demo",
      reminderOffsetMinutes,
      reminderAt,
      // Evita que el cron envíe correos reales a la cuenta demo.
      reminderEmailSent: true,
    },
  });
  console.log("✓ Cita demo próxima creada (+3 días).");
}

export async function seedDemoData(
  prisma: PrismaClient,
  userId: string,
): Promise<void> {
  for (const demo of DEMO_INTERVIEWS) {
    await seedOneInterview(prisma, userId, demo);
  }
  await seedUpcomingSchedule(prisma, userId);
}
