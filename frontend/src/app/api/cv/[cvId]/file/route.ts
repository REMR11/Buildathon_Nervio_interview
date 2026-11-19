import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { downloadCvFile } from "@/lib/cv/storage";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Devuelve el archivo original del CV (solo el dueño). Se sirve inline para
 * la miniatura y para abrirlo en una pestaña nueva. Sin sesión → 401; ajeno,
 * inexistente o sin archivo guardado → 404.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ cvId: string }> },
) {
  const session = await auth.api.getSession({ headers: await headers() });
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const { cvId } = await params;
  const notFound = () =>
    NextResponse.json({ error: "CV no encontrado" }, { status: 404 });
  if (!UUID_RE.test(cvId)) return notFound();
  const cv = await prisma.candidateCv.findFirst({
    where: { id: cvId, userId },
  });
  if (!cv?.storagePath) return notFound();
  const blob = await downloadCvFile(cv.storagePath);
  if (!blob) return notFound();
  const safeName = cv.fileName.replace(/[^\w.\- ]+/g, "_");
  return new Response(blob.stream(), {
    headers: {
      "Content-Type": cv.mimeType,
      "Content-Length": String(blob.size),
      "Content-Disposition": `inline; filename="${safeName}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
