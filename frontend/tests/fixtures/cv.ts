/** Texto ficticio de CV. Nunca usar CVs reales. */
export const FICTIONAL_CV_TEXT =
  "CV de prueba (ficticio). Candidato de software con experiencia en TypeScript, React y PostgreSQL. Ha colaborado en equipos ágiles, documentado APIs REST y practicado entrevistas técnicas simuladas.";

export function pdfMagicBytes(extra = ""): Uint8Array {
  return new Uint8Array(
    Buffer.concat([Buffer.from("%PDF-1.4\n"), Buffer.from(extra)]),
  );
}

/** Bytes que `detectCvKind` reconoce como DOCX (ZIP + carpeta word/). */
export function docxMagicBytes(): Uint8Array {
  return new Uint8Array(
    Buffer.concat([
      Buffer.from([0x50, 0x4b, 0x03, 0x04]),
      Buffer.from("word/document.xml"),
    ]),
  );
}

/**
 * PDF mínimo con texto seleccionable. Los offsets de xref se calculan para
 * que un lector PDF pueda extraer el párrafo ficticio.
 */
export function fictionalCvPdfBytes(): Uint8Array {
  const stream =
    "BT /F1 12 Tf 72 720 Td (Fictional CV for automated tests. Software engineer with TypeScript React PostgreSQL teamwork and API design experience.) Tj ET";
  const objects = [
    "1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n",
    "2 0 obj<</Type/Pages/Count 1/Kids[3 0 R]>>endobj\n",
    "3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R/Resources<</Font<</F1 4 0 R>>>>/Contents 5 0 R>>endobj\n",
    "4 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj\n",
    `5 0 obj<</Length ${stream.length}>>stream\n${stream}\nendstream\nendobj\n`,
  ];
  let body = "%PDF-1.4\n";
  const offsets = [0];
  for (const object of objects) {
    offsets.push(Buffer.byteLength(body, "latin1"));
    body += object;
  }
  const xrefStart = Buffer.byteLength(body, "latin1");
  let xref = `xref\n0 6\n0000000000 65535 f \n`;
  for (let i = 1; i <= 5; i++) {
    xref += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }
  body += `${xref}trailer<</Size 6/Root 1 0 R>>\nstartxref\n${xrefStart}\n%%EOF\n`;
  return new Uint8Array(Buffer.from(body, "latin1"));
}

export function fictionalCvFile(
  name: string,
  bytes: Uint8Array,
  type: string,
): File {
  return new File([Buffer.from(bytes)], name, { type });
}
