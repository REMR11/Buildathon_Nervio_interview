import { toInterviewReport } from "@/lib/interview/reporting";
import type { InterviewReport } from "@/lib/interview/types";
import { prisma } from "@/lib/prisma";

export const REPORT_INCLUDE = {
  evaluations: true,
  user: true,
  transcriptTurns: { orderBy: { orderIndex: "asc" as const } },
  questions: {
    orderBy: { orderIndex: "asc" as const },
    include: { responses: { orderBy: { createdAt: "asc" as const } } },
  },
};

/** Reporte ya guardado (sin llamar a ElevenLabs). `userId` restringe al dueño. */
export async function loadStoredReport(
  sessionId: string,
  userId?: string,
): Promise<InterviewReport | null> {
  const interview = await prisma.interviewSession.findFirst({
    where: { id: sessionId, ...(userId ? { userId } : {}) },
    include: REPORT_INCLUDE,
  });
  if (!interview?.evaluations) return null;
  return toInterviewReport(interview);
}

/** Devuelve el sessionId de un enlace público vigente (no revocado ni vencido). */
export async function resolveShareToken(token: string) {
  if (!/^[A-Za-z0-9_-]{20,64}$/.test(token)) return null;
  const share = await prisma.report_shares.findUnique({ where: { token } });
  if (!share || share.revokedAt || share.expiresAt.getTime() <= Date.now()) {
    return null;
  }
  return share;
}
