import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { toCvSummary } from "@/lib/cv/serialize";
import { removeCvFile } from "@/lib/cv/storage";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function findOwnedCv(cvId: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  const userId = session?.user?.id;
  if (!userId) return { status: 401 as const };
  if (!UUID_RE.test(cvId)) return { status: 404 as const };
  const cv = await prisma.candidateCv.findFirst({
    where: { id: cvId, userId },
  });
  return cv ? { status: 200 as const, cv } : { status: 404 as const };
}

function errorFor(status: 401 | 404) {
  return NextResponse.json(
    { error: status === 401 ? "No autorizado" : "CV no encontrado" },
    { status },
  );
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ cvId: string }> },
) {
  const result = await findOwnedCv((await params).cvId);
  if (result.status !== 200) return errorFor(result.status);
  return NextResponse.json({ cv: toCvSummary(result.cv) });
}

/** Elimina el CV (fila + archivo). Las sesiones que lo usaban quedan con cv_id = NULL. */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ cvId: string }> },
) {
  const result = await findOwnedCv((await params).cvId);
  if (result.status !== 200) return errorFor(result.status);
  await prisma.candidateCv.delete({ where: { id: result.cv.id } });
  if (result.cv.storagePath) await removeCvFile(result.cv.storagePath);
  return NextResponse.json({ deleted: true, id: result.cv.id });
}
