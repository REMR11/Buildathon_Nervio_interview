import { prisma } from "@/lib/prisma";

const TABLES = [
  "support_replies",
  "support_tickets",
  "report_shares",
  "transcript_turns",
  "webhook_logs",
  "schedules",
  "responses",
  "recordings",
  "questions",
  "evaluations",
  "candidate_cvs",
  "interview_sessions",
  "session",
  "account",
  "verification",
  "user",
] as const;

export async function resetDatabase() {
  const list = TABLES.map((name) => `"${name}"`).join(", ");
  await prisma.$executeRawUnsafe(
    `TRUNCATE TABLE ${list} RESTART IDENTITY CASCADE`,
  );
}
