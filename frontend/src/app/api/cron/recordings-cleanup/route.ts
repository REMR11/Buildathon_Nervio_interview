import { NextResponse } from "next/server";
import { cleanupExpiredRecordings } from "@/lib/interview/recordings";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const authorization = request.headers.get("authorization");

  if (!secret || authorization !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    return NextResponse.json(await cleanupExpiredRecordings());
  } catch (error) {
    console.error("GET /api/cron/recordings-cleanup error:", error);
    return NextResponse.json(
      { error: "No se pudieron limpiar las grabaciones" },
      { status: 500 },
    );
  }
}
