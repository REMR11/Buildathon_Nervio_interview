import { describe, expect, it } from "vitest";
import { buildNervioEmail, escapeHtml } from "@/lib/email/nervio-email-layout";

describe("escapeHtml", () => {
  it("escapa caracteres peligrosos", () => {
    expect(escapeHtml(`<img src=x onerror="alert(1)"> & 'no'`)).toBe(
      `&lt;img src=x onerror=&quot;alert(1)&quot;&gt; &amp; 'no'`,
    );
  });
});

describe("buildNervioEmail", () => {
  it("incluye heading, filas y CTA escapados", () => {
    const html = buildNervioEmail({
      preheader: "Aviso",
      badge: "Test",
      heading: "Hola <script>",
      intro: "Intro",
      detailRows: [{ label: "Puesto", value: "QA & Test" }],
      ctaHref: "https://nervio.test/interview/1",
      ctaLabel: "Entrar",
      footerNote: "Pie",
    });
    expect(html).toContain("Hola &lt;script&gt;");
    expect(html).toContain("QA &amp; Test");
    expect(html).toContain("Entrar");
    expect(html).not.toContain("<script>");
  });
});
