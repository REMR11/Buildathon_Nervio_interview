-- Grabaciones en Supabase Storage con expiración de 14 días. Solo cambios aditivos.

-- AlterTable
ALTER TABLE "recordings" ADD COLUMN "storage_path" TEXT,
ADD COLUMN "expires_at" TIMESTAMPTZ(6),
ADD COLUMN "deleted_at" TIMESTAMPTZ(6);

-- CreateIndex
CREATE INDEX "idx_recordings_expires_at" ON "recordings"("expires_at");
