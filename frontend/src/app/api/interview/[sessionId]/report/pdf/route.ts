import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { loadStoredReport } from "@/lib/interview/report-data";
import { pdfResponse, renderReportPdf } from "@/lib/pdf/report-document";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ sessionId: string }>;
}

export async function GET(_request: Request, { params }: RouteContext) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    const { sessionId } = await params;
    const report = await loadStoredReport(sessionId, session.user.id);
    if (!report) {
      return NextResponse.json(
        { error: "Reporte no encontrado" },
        { status: 404 },
      );
    }
    return pdfResponse(await renderReportPdf(report), report);
  } catch (error) {
    console.error("GET report pdf error:", error);
    return NextResponse.json(
      { error: "No se pudo generar el PDF" },
      { status: 500 },
    );
  }
}
