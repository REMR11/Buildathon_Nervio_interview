import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { INTERVIEW_TYPE_OPTIONS } from "@/lib/interview";
import {
  loadStoredReport,
  resolveShareToken,
} from "@/lib/interview/report-data";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Reporte compartido · Nervio",
  robots: { index: false, follow: false, nocache: true },
  referrer: "no-referrer",
};

interface SharedReportPageProps {
  params: Promise<{ token: string }>;
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="flex justify-between text-sm">
        <span>{label}</span>
        <span className="font-semibold">{value}</span>
      </div>
      <div className="mt-1 h-2 rounded-full bg-muted">
        <div
          className="h-2 rounded-full bg-primary"
          style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
        />
      </div>
    </div>
  );
}

export default async function SharedReportPage({
  params,
}: SharedReportPageProps) {
  const { token } = await params;
  const share = await resolveShareToken(token);
  const report = share ? await loadStoredReport(share.sessionId) : null;
  if (!report) notFound();

  const typeLabel =
    INTERVIEW_TYPE_OPTIONS.find((o) => o.value === report.interviewType)
      ?.label ?? report.interviewType;

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-8 px-6 py-16">
      <header className="text-center">
        <p className="text-sm text-muted-foreground">
          Reporte compartido · solo lectura
        </p>
        <h1 className="mt-2 font-[family-name:var(--font-heading)] text-3xl font-bold gradient-text">
          {report.candidateName}
        </h1>
        <p className="mt-1 text-muted-foreground">
          {report.role} · {typeLabel}
        </p>
        <a
          href={`/api/r/${token}/pdf`}
          className="mt-4 inline-block rounded-md border px-4 py-2 text-sm hover:bg-muted"
        >
          Descargar PDF
        </a>
      </header>

      <section className="glass-panel flex flex-col items-center gap-6 rounded-2xl p-8 sm:flex-row sm:justify-around">
        <div className="text-center">
          <p className="text-5xl font-bold text-primary">
            {report.scoreGlobal}
          </p>
          <p className="text-sm text-muted-foreground">Puntaje global</p>
        </div>
        <div className="w-full max-w-sm space-y-3">
          <Metric label="Claridad" value={report.scoreClarity} />
          <Metric label="Conocimiento" value={report.scoreKnowledge} />
          <Metric label="Confianza" value={report.scoreConfidence} />
          <Metric label="Estructura" value={report.scoreStructure} />
        </div>
      </section>

      <section className="grid gap-6 sm:grid-cols-2">
        {[
          { title: "Fortalezas", items: report.strengths },
          { title: "Áreas de mejora", items: report.weaknesses },
        ].map((block) => (
          <div key={block.title} className="glass-panel rounded-2xl p-6">
            <h2 className="mb-3 font-semibold">{block.title}</h2>
            <ul className="list-disc space-y-1 pl-5 text-sm">
              {block.items.length === 0 ? (
                <li className="text-muted-foreground">Sin datos.</li>
              ) : (
                block.items.map((item) => <li key={item}>{item}</li>)
              )}
            </ul>
          </div>
        ))}
      </section>

      <section className="glass-panel rounded-2xl p-6">
        <h2 className="mb-2 font-semibold">Recomendación</h2>
        <p className="text-sm">{report.recommendation}</p>
      </section>

      {report.transcript.length > 0 ? (
        <section className="glass-panel space-y-4 rounded-2xl p-6">
          <h2 className="font-semibold">Transcripción y feedback</h2>
          {report.transcript.map((item) => (
            <div key={item.order} className="rounded-lg border p-4 text-sm">
              <p className="font-medium">
                {item.order}. {item.question}
              </p>
              <p className="mt-2 text-muted-foreground">
                {item.answer || "(sin respuesta)"}
              </p>
              {item.feedback ? (
                <p className="mt-2 text-primary">
                  {item.score !== null ? `${item.score}/100 · ` : ""}
                  {item.feedback}
                </p>
              ) : null}
            </div>
          ))}
        </section>
      ) : null}
    </main>
  );
}
