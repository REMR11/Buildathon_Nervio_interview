import { NextResponse } from "next/server";
import {
  loadStoredReport,
  resolveShareToken,
} from "@/lib/interview/report-data";
import { pdfResponse, renderReportPdf } from "@/lib/pdf/report-document";

export const runtime = "nodejs";

const NOINDEX = { "X-Robots-Tag": "noindex, nofollow" };

interface RouteContext {
  params: Promise<{ token: string }>;
}

export async function GET(_request: Request, { params }: RouteContext) {
  try {
    const { token } = await params;
    const share = await resolveShareToken(token);
    const report = share ? await loadStoredReport(share.sessionId) : null;
    if (!report) {
      return NextResponse.json(
        { error: "Enlace no válido o vencido" },
        { status: 404, headers: NOINDEX },
      );
    }
    return pdfResponse(await renderReportPdf(report), report, NOINDEX);
  } catch (error) {
    console.error("GET shared pdf error:", error);
    return NextResponse.json(
      { error: "No se pudo generar el PDF" },
      { status: 500, headers: NOINDEX },
    );
  }
}
