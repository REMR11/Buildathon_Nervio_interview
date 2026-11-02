import {
  Document,
  Page,
  renderToBuffer,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";
import { INTERVIEW_TYPE_OPTIONS } from "@/lib/interview";
import type { InterviewReport } from "@/lib/interview/types";

const BRAND = "#0891b2";
const MUTED = "#64748b";

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: "Helvetica",
    color: "#0f172a",
    lineHeight: 1.4,
  },
  header: {
    borderBottomWidth: 2,
    borderBottomColor: BRAND,
    paddingBottom: 10,
    marginBottom: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  brand: { fontSize: 20, fontFamily: "Helvetica-Bold", color: BRAND },
  muted: { color: MUTED },
  h1: { fontSize: 16, fontFamily: "Helvetica-Bold" },
  h2: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    color: BRAND,
    marginTop: 14,
    marginBottom: 6,
  },
  scoreRow: { flexDirection: "row", gap: 16, alignItems: "center" },
  scoreBig: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 4,
    borderColor: BRAND,
    alignItems: "center",
    justifyContent: "center",
  },
  scoreBigText: { fontSize: 26, fontFamily: "Helvetica-Bold", color: BRAND },
  metric: { marginBottom: 6 },
  barBg: { height: 6, backgroundColor: "#e2e8f0", borderRadius: 3 },
  barFg: { height: 6, backgroundColor: BRAND, borderRadius: 3 },
  cols: { flexDirection: "row", gap: 16 },
  col: { flex: 1 },
  bullet: { flexDirection: "row", marginBottom: 3 },
  qa: {
    marginBottom: 10,
    padding: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 4,
  },
  bold: { fontFamily: "Helvetica-Bold" },
  footer: {
    position: "absolute",
    bottom: 20,
    left: 40,
    right: 40,
    fontSize: 8,
    color: MUTED,
    flexDirection: "row",
    justifyContent: "space-between",
  },
});

function Metric({ label, value }: { label: string; value: number }) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <View style={styles.metric}>
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <Text>{label}</Text>
        <Text style={styles.bold}>{pct}</Text>
      </View>
      <View style={styles.barBg}>
        <View style={[styles.barFg, { width: `${pct}%` }]} />
      </View>
    </View>
  );
}

function Bullets({ items, empty }: { items: string[]; empty: string }) {
  if (items.length === 0) return <Text style={styles.muted}>{empty}</Text>;
  return (
    <View>
      {items.map((item) => (
        <View key={item} style={styles.bullet}>
          <Text style={{ width: 10 }}>•</Text>
          <Text style={{ flex: 1 }}>{item}</Text>
        </View>
      ))}
    </View>
  );
}

export function ReportDocument({ report }: { report: InterviewReport }) {
  const typeLabel =
    INTERVIEW_TYPE_OPTIONS.find((o) => o.value === report.interviewType)
      ?.label ?? report.interviewType;
  const generated = new Date().toLocaleDateString("es-SV", {
    dateStyle: "long",
  });

  return (
    <Document
      title={`Reporte Nervio - ${report.candidateName}`}
      author="Nervio"
    >
      <Page size="A4" style={styles.page}>
        <View style={styles.header} fixed>
          <Text style={styles.brand}>Nervio</Text>
          <Text style={styles.muted}>Reporte de entrevista · {generated}</Text>
        </View>

        <Text style={styles.h1}>{report.candidateName}</Text>
        <Text style={styles.muted}>
          {report.role} · {typeLabel}
        </Text>

        <Text style={styles.h2}>Puntaje</Text>
        <View style={styles.scoreRow}>
          <View style={styles.scoreBig}>
            <Text style={styles.scoreBigText}>{report.scoreGlobal}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Metric label="Claridad" value={report.scoreClarity} />
            <Metric label="Conocimiento" value={report.scoreKnowledge} />
            <Metric label="Confianza" value={report.scoreConfidence} />
            <Metric label="Estructura" value={report.scoreStructure} />
          </View>
        </View>

        <View style={styles.cols}>
          <View style={styles.col}>
            <Text style={styles.h2}>Fortalezas</Text>
            <Bullets items={report.strengths} empty="Sin datos." />
          </View>
          <View style={styles.col}>
            <Text style={styles.h2}>Áreas de mejora</Text>
            <Bullets items={report.weaknesses} empty="Sin datos." />
          </View>
        </View>

        <Text style={styles.h2}>Recomendación</Text>
        <Text>{report.recommendation}</Text>

        <Text style={styles.h2} break={report.transcript.length > 0}>
          Transcripción y feedback
        </Text>
        {report.transcript.length === 0 ? (
          <Text style={styles.muted}>No hay transcripción disponible.</Text>
        ) : (
          report.transcript.map((item) => (
            <View key={item.order} style={styles.qa} wrap={false}>
              <Text style={styles.bold}>
                {item.order}. {item.question}
              </Text>
              <Text style={{ marginTop: 3 }}>
                {item.answer || "(sin respuesta)"}
              </Text>
              {item.feedback ? (
                <Text style={{ marginTop: 4, color: BRAND }}>
                  Feedback
                  {item.score !== null ? ` (${item.score}/100)` : ""}:{" "}
                  {item.feedback}
                </Text>
              ) : null}
              {item.suggestion ? (
                <Text style={[styles.muted, { marginTop: 2 }]}>
                  Sugerencia: {item.suggestion}
                </Text>
              ) : null}
            </View>
          ))
        )}

        <View style={styles.footer} fixed>
          <Text>Nervio · Práctica de entrevistas con IA</Text>
          <Text
            render={({ pageNumber, totalPages }) =>
              `${pageNumber} / ${totalPages}`
            }
          />
        </View>
      </Page>
    </Document>
  );
}

export async function renderReportPdf(report: InterviewReport) {
  return renderToBuffer(<ReportDocument report={report} />);
}

export function pdfResponse(
  buffer: Buffer,
  report: InterviewReport,
  extraHeaders: Record<string, string> = {},
) {
  const slug =
    report.candidateName
      .normalize("NFD")
      .replace(/[^\w\s-]/g, "")
      .trim()
      .replace(/\s+/g, "-")
      .toLowerCase() || "reporte";
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="nervio-${slug}.pdf"`,
      "Cache-Control": "private, no-store",
      ...extraHeaders,
    },
  });
}
