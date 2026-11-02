// Límites compartidos entre cliente y servidor para la subida de CV (RF-CV-01).
export const CV_MAX_BYTES = 5 * 1024 * 1024;
export const CV_MAX_PAGES = 10;
export const CV_MAX_TEXT_CHARS = 8000;
export const CV_MIN_TEXT_CHARS = 80;
export const CV_ACCEPT =
  ".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document";

export interface CandidateCvSummary {
  id: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  pageCount: number | null;
  extractedText: string;
  truncated: boolean;
  stored: boolean;
  createdAt: string;
}

export interface CvUploadResponse {
  cv: CandidateCvSummary;
  /** Aviso cuando el archivo no pudo guardarse (p. ej. Storage sin configurar). */
  storageWarning: string | null;
}
