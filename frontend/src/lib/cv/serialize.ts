import type { CandidateCv } from "@/generated/prisma/client";
import type { CandidateCvSummary } from "./constants";

export function toCvSummary(cv: CandidateCv): CandidateCvSummary {
  return {
    id: cv.id,
    fileName: cv.fileName,
    mimeType: cv.mimeType,
    sizeBytes: cv.sizeBytes,
    pageCount: cv.pageCount,
    extractedText: cv.extractedText,
    truncated: cv.truncated,
    stored: Boolean(cv.storagePath),
    createdAt: cv.createdAt.toISOString(),
  };
}
