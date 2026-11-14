import { prisma } from "@/lib/prisma";
import { CV_MAX_TEXT_CHARS } from "./constants";

export class CvNotFoundError extends Error {
  constructor() {
    super("CV no encontrado");
  }
}

/**
 * Valida que el CV pertenezca al usuario y devuelve el texto a usar como contexto.
 * Si el cliente editó la vista previa (`cvText`), se respeta esa versión.
 */
export async function resolveCvForSetup(
  setup: { cvId?: string | null; cvText?: string | null },
  userId: string,
): Promise<{ cvId: string | null; cvText: string | undefined }> {
  const edited = setup.cvText?.trim().slice(0, CV_MAX_TEXT_CHARS) || undefined;
  if (!setup.cvId) return { cvId: null, cvText: edited };
  const cv = await prisma.candidateCv.findFirst({
    where: { id: setup.cvId, userId },
    select: { id: true, extractedText: true },
  });
  if (!cv) throw new CvNotFoundError();
  return { cvId: cv.id, cvText: edited ?? cv.extractedText };
}
