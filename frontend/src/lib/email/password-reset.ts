import { Resend } from "resend";
import { buildNervioEmail, escapeHtml } from "@/lib/email/nervio-email-layout";

export async function sendPasswordResetEmail(input: {
  to: string;
  name?: string | null;
  url: string;
}): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;

  if (!apiKey || !from) {
    console.warn(
      "[password-reset] RESEND_API_KEY o EMAIL_FROM no configurados; no se envió el correo",
    );
    return;
  }

  const html = buildNervioEmail({
    preheader: "Restablece tu contraseña de Nervio",
    badge: "Seguridad",
    heading: "Restablece tu contraseña",
    intro: `Hola${input.name ? ` ${escapeHtml(input.name)}` : ""}, recibimos una solicitud para cambiar la contraseña de tu cuenta. El enlace vence en 1 hora.`,
    detailRows: [],
    ctaHref: input.url,
    ctaLabel: "Crear nueva contraseña",
    footerNote:
      "Si no solicitaste este cambio, ignora este correo; tu contraseña seguirá siendo la misma.",
  });

  try {
    const result = await new Resend(apiKey).emails.send({
      from,
      to: input.to,
      subject: "Restablece tu contraseña de Nervio",
      html,
    });
    if (result.error) {
      console.error("[password-reset] Resend error:", result.error);
    }
  } catch (error) {
    console.error("[password-reset] Error enviando correo:", error);
  }
}
