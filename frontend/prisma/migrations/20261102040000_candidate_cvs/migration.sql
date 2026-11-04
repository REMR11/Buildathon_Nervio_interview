-- Subida de CV (RF-CV-01 / RF-CV-02). Solo cambios aditivos.

-- CreateTable
CREATE TABLE "candidate_cvs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "page_count" INTEGER,
    "storage_path" TEXT,
    "extracted_text" TEXT NOT NULL,
    "truncated" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "candidate_cvs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_candidate_cvs_user_created" ON "candidate_cvs"("user_id", "created_at");

-- AddForeignKey
ALTER TABLE "candidate_cvs" ADD CONSTRAINT "candidate_cvs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "interview_sessions" ADD COLUMN "cv_id" UUID;

-- AddForeignKey
ALTER TABLE "interview_sessions" ADD CONSTRAINT "interview_sessions_cv_id_fkey" FOREIGN KEY ("cv_id") REFERENCES "candidate_cvs"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
