import {
  CV_MAX_PAGES,
  CV_MAX_TEXT_CHARS,
  CV_MIN_TEXT_CHARS,
} from "./constants";

export type CvKind = "pdf" | "docx";

export const CV_MIME: Record<CvKind, string> = {
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};

export class CvValidationError extends Error {
  constructor(
    message: string,
    public status: 400 | 413 | 415 | 422,
  ) {
    super(message);
  }
}

/** Detecta el tipo real por magic bytes y exige que coincida con la extensión. */
export function detectCvKind(fileName: string, bytes: Uint8Array): CvKind {
  const ext = fileName.toLowerCase().split(".").pop();
  const isPdf =
    bytes.length > 5 &&
    String.fromCharCode(...bytes.subarray(0, 5)) === "%PDF-";
  const isZip =
    bytes.length > 4 &&
    bytes[0] === 0x50 &&
    bytes[1] === 0x4b &&
    bytes[2] === 0x03 &&
    bytes[3] === 0x04;
  const isDocx =
    isZip && Buffer.from(bytes).includes(Buffer.from("word/", "latin1"));

  if (ext === "pdf" && isPdf) return "pdf";
  if (ext === "docx" && isDocx) return "docx";
  if (ext !== "pdf" && ext !== "docx") {
    throw new CvValidationError("Solo se aceptan archivos PDF o DOCX.", 415);
  }
  throw new CvValidationError(
    "El contenido del archivo no coincide con su extensión. Sube un PDF o DOCX válido.",
    415,
  );
}

/** Normaliza el texto extraído: quita controles, colapsa espacios y recorta. */
export function cleanCvText(raw: string): { text: string; truncated: boolean } {
  const cleaned = raw
    .normalize("NFKC")
    .replace(/\r\n?/g, "\n")
    // biome-ignore lint/suspicious/noControlCharactersInRegex: limpieza intencional
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F\u00AD\uFFFD]/g, "")
    .replace(/[ \t\u00A0]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  if (cleaned.length <= CV_MAX_TEXT_CHARS) {
    return { text: cleaned, truncated: false };
  }
  return {
    text: cleaned.slice(0, CV_MAX_TEXT_CHARS).trimEnd(),
    truncated: true,
  };
}

export async function extractCvText(
  kind: CvKind,
  bytes: Uint8Array,
): Promise<{ text: string; truncated: boolean; pageCount: number | null }> {
  let raw = "";
  let pageCount: number | null = null;

  try {
    if (kind === "pdf") {
      const { getDocumentProxy, extractText } = await import("unpdf");
      const pdf = await getDocumentProxy(new Uint8Array(bytes));
      pageCount = pdf.numPages;
      if (pageCount > CV_MAX_PAGES) {
        throw new CvValidationError(
          `El CV tiene ${pageCount} páginas; el máximo es ${CV_MAX_PAGES}.`,
          422,
        );
      }
      const result = await extractText(pdf, { mergePages: true });
      raw = Array.isArray(result.text) ? result.text.join("\n") : result.text;
    } else {
      const mammoth = await import("mammoth");
      const result = await mammoth.extractRawText({
        buffer: Buffer.from(bytes),
      });
      raw = result.value;
    }
  } catch (error) {
    if (error instanceof CvValidationError) throw error;
    console.warn("CV extract error:", error);
    throw new CvValidationError(
      "No pudimos leer el archivo. Puede estar dañado o protegido con contraseña.",
      422,
    );
  }

  const { text, truncated } = cleanCvText(raw);
  if (text.length < CV_MIN_TEXT_CHARS) {
    throw new CvValidationError(
      "No encontramos texto en el CV. Si es un PDF escaneado o una imagen, exporta una versión con texto seleccionable o pega tu perfil manualmente.",
      422,
    );
  }
  return { text, truncated, pageCount };
}
