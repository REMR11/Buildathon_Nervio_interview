import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { CV_MAX_BYTES, type CvUploadResponse } from "@/lib/cv/constants";
import {
  CV_MIME,
  CvValidationError,
  detectCvKind,
  extractCvText,
} from "@/lib/cv/extract";
import { toCvSummary } from "@/lib/cv/serialize";
import { uploadCvFile } from "@/lib/cv/storage";
import { prisma } from "@/lib/prisma";
import { checkCvUploadRateLimit } from "@/lib/rate-limit";
import { isStorageConfigured } from "@/lib/storage/supabase-server";

export const runtime = "nodejs";

async function requireUserId() {
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user?.id ?? null;
}

/** Lista los CVs más recientes del usuario autenticado (máx. 5). */
export async function GET() {
  const userId = await requireUserId();
  if (!userId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const cvs = await prisma.candidateCv.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 5,
  });
  return NextResponse.json({ cvs: cvs.map(toCvSummary) });
}

/** Sube un CV (PDF/DOCX ≤ 5 MB), extrae su texto y lo guarda en el bucket privado. */
export async function POST(request: Request) {
  const userId = await requireUserId();
  if (!userId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const declared = Number(request.headers.get("content-length") ?? 0);
  if (declared > CV_MAX_BYTES + 64 * 1024) {
    return NextResponse.json(
      { error: "El archivo supera el máximo de 5 MB." },
      { status: 413 },
    );
  }

  const limit = checkCvUploadRateLimit(userId);
  if (!limit.ok) {
    return NextResponse.json(
      { error: limit.message },
      {
        status: 429,
        headers: { "Retry-After": String(limit.retryAfterSeconds) },
      },
    );
  }

  try {
    let form: FormData;
    try {
      form = await request.formData();
    } catch {
      throw new CvValidationError(
        "Envía el archivo como multipart/form-data en el campo «file».",
        400,
      );
    }
    const file = form.get("file");
    if (!(file instanceof File) || file.size === 0) {
      throw new CvValidationError(
        "Adjunta un archivo en el campo «file».",
        400,
      );
    }
    if (file.size > CV_MAX_BYTES) {
      throw new CvValidationError("El archivo supera el máximo de 5 MB.", 413);
    }

    const bytes = new Uint8Array(await file.arrayBuffer());
    const fileName = file.name.slice(0, 200) || "cv";
    const kind = detectCvKind(fileName, bytes);
    const { text, truncated, pageCount } = await extractCvText(kind, bytes);

    const id = crypto.randomUUID();
    const path = `${userId}/${id}.${kind}`;
    const stored = await uploadCvFile(path, bytes, CV_MIME[kind]);

    const cv = await prisma.candidateCv.create({
      data: {
        id,
        userId,
        fileName,
        mimeType: CV_MIME[kind],
        sizeBytes: file.size,
        pageCount,
        storagePath: stored ? path : null,
        extractedText: text,
        truncated,
      },
    });

    const body: CvUploadResponse = {
      cv: toCvSummary(cv),
      storageWarning: stored
        ? null
        : isStorageConfigured()
          ? "Extrajimos el texto, pero no pudimos guardar el archivo. Puedes continuar igual."
          : "Extrajimos el texto, pero el almacenamiento de archivos no está configurado: el archivo original no se guardó.",
    };
    return NextResponse.json(body, { status: 201 });
  } catch (error) {
    if (error instanceof CvValidationError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }
    console.error("POST /api/cv error:", error);
    return NextResponse.json(
      { error: "No se pudo procesar el CV. Intenta de nuevo." },
      { status: 500 },
    );
  }
}
