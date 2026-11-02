import {
  cancelScheduledReminderEmail,
  sendScheduleReminderEmail,
} from "@/lib/email/schedule-reminder";
import { prisma } from "@/lib/prisma";

const POLL_MS = 60_000;
/** Resend permite programar envíos hasta 30 días antes; dejamos margen. */
const SCHEDULE_WINDOW_MS = 29 * 24 * 60 * 60 * 1000;

const globalForPoller = globalThis as typeof globalThis & {
  __nervioReminderPoller?: boolean;
};

/**
 * Entrega (o programa en Resend) el recordatorio de una cita.
 * - reminderAt ya pasó y la cita es futura: se envía ahora.
 * - reminderAt dentro de 29 días: Resend lo programa con scheduledAt.
 * - Más lejos: no hace nada; el cron diario lo programará cuando entre en la ventana.
 * `reminderEmailSent` significa "enviado o programado"; se reclama de forma atómica.
 */
export async function queueReminderForSchedule(
  scheduleId: string,
): Promise<boolean> {
  const now = Date.now();
  const schedule = await prisma.schedules.findUnique({
    where: { id: scheduleId },
    include: { user: true, interviewSession: true },
  });
  if (
    !schedule ||
    schedule.reminderEmailSent ||
    !schedule.sessionId ||
    !schedule.interviewSession ||
    !schedule.user?.email ||
    schedule.scheduledAt.getTime() <= now ||
    schedule.reminderAt.getTime() > now + SCHEDULE_WINDOW_MS
  ) {
    return false;
  }

  const claimed = await prisma.schedules.updateMany({
    where: { id: schedule.id, reminderEmailSent: false },
    data: { reminderEmailSent: true },
  });
  if (claimed.count !== 1) return false;

  const interview = schedule.interviewSession;
  const result = await sendScheduleReminderEmail({
    to: schedule.user.email,
    candidateName:
      schedule.candidateName.trim() ||
      schedule.user.name?.trim() ||
      "Candidato",
    role: interview.role,
    level: interview.level,
    interviewType: interview.interviewType,
    stack: interview.stack,
    scheduledAt: schedule.scheduledAt,
    reminderOffsetMinutes: schedule.reminderOffsetMinutes,
    sessionId: schedule.sessionId,
    sendAt: schedule.reminderAt,
  });

  if (result.ok) {
    await prisma.schedules.update({
      where: { id: schedule.id },
      data: { reminderEmailId: result.id },
    });
    return true;
  }

  await prisma.schedules.update({
    where: { id: schedule.id },
    data: { reminderEmailSent: false },
  });
  console.warn("Schedule reminder email:", result.error);
  return false;
}

/**
 * Cancela el recordatorio programado (si lo hay) y deja la cita lista para
 * reprogramarse. Usar cuando cambia la fecha o el aviso de una cita.
 */
export async function resetReminderForSchedule(scheduleId: string) {
  const schedule = await prisma.schedules.findUnique({
    where: { id: scheduleId },
    select: { reminderEmailId: true, reminderAt: true },
  });
  if (schedule?.reminderEmailId && schedule.reminderAt.getTime() > Date.now()) {
    await cancelScheduledReminderEmail(schedule.reminderEmailId);
  }
  await prisma.schedules.update({
    where: { id: scheduleId },
    data: { reminderEmailSent: false, reminderEmailId: null },
  });
}

/**
 * Barrido de respaldo (cron diario en Vercel y poller local): envía los
 * vencidos y programa en Resend los que entraron en la ventana de 29 días.
 */
export async function sendDueReminders(): Promise<number> {
  const now = new Date();
  const pending = await prisma.schedules.findMany({
    where: {
      reminderEmailSent: false,
      reminderAt: { lte: new Date(now.getTime() + SCHEDULE_WINDOW_MS) },
      scheduledAt: { gt: now },
      sessionId: { not: null },
    },
    select: { id: true },
    orderBy: { reminderAt: "asc" },
    take: 50,
  });

  let queued = 0;
  for (const { id } of pending) {
    if (await queueReminderForSchedule(id)) queued += 1;
  }
  return queued;
}

export function startReminderPoller(): void {
  if (globalForPoller.__nervioReminderPoller) return;
  globalForPoller.__nervioReminderPoller = true;

  void sendDueReminders().catch((error) => {
    console.error("Reminder poller:", error);
  });

  setInterval(() => {
    void sendDueReminders().catch((error) => {
      console.error("Reminder poller:", error);
    });
  }, POLL_MS);
}
