-- Transcripción completa (ElevenLabs) y feedback por respuesta. Solo cambios aditivos.

-- AlterTable
ALTER TABLE "interview_sessions" ADD COLUMN "elevenlabs_conversation_id" TEXT;

-- AlterTable
ALTER TABLE "responses" ADD COLUMN "feedback" TEXT,
ADD COLUMN "score" INTEGER,
ADD COLUMN "suggestion" TEXT;

-- CreateTable
CREATE TABLE "transcript_turns" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "session_id" UUID NOT NULL,
    "order_index" INTEGER NOT NULL,
    "role" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "time_in_call_secs" INTEGER,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transcript_turns_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_transcript_turns_session_id" ON "transcript_turns"("session_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_transcript_turns_session_order" ON "transcript_turns"("session_id", "order_index");

-- AddForeignKey
ALTER TABLE "transcript_turns" ADD CONSTRAINT "transcript_turns_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "interview_sessions"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- Backfill: copiar el conversationId guardado en webhook_logs a la nueva columna
UPDATE "interview_sessions" s
SET "elevenlabs_conversation_id" = w.conversation_id
FROM (
    SELECT DISTINCT ON ("session_id") "session_id", "request_payload"->>'conversationId' AS conversation_id
    FROM "webhook_logs"
    WHERE "flow_name" = 'elevenlabs-conversation'
      AND "status" = 'conversation_id'
      AND "session_id" IS NOT NULL
    ORDER BY "session_id", "created_at" DESC
) w
WHERE s."id" = w."session_id"
  AND s."elevenlabs_conversation_id" IS NULL
  AND w.conversation_id IS NOT NULL;
