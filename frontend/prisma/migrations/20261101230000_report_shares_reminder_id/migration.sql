-- Enlaces públicos de reporte e id del recordatorio programado en Resend. Solo cambios aditivos.

-- AlterTable
ALTER TABLE "schedules" ADD COLUMN "reminder_email_id" TEXT;

-- CreateTable
CREATE TABLE "report_shares" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "session_id" UUID NOT NULL,
    "token" TEXT NOT NULL,
    "created_by_id" TEXT,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "revoked_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "report_shares_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "report_shares_token_key" ON "report_shares"("token");

-- CreateIndex
CREATE INDEX "idx_report_shares_session_id" ON "report_shares"("session_id");

-- AddForeignKey
ALTER TABLE "report_shares" ADD CONSTRAINT "report_shares_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "interview_sessions"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
