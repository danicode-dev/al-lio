import { absolutePublicAssetUrl } from "@/lib/auth/app-url";

// Plain, safe HTML templates - no user-supplied free text beyond the
// recipient's own (defensively escaped) email address, so there is no
// email-body injection surface. Confirmation/reset links are
// server-generated absolute URLs, not user input. The logo is the app's
// own already-public static asset, referenced by absolute production URL
// (email clients fetch images over the real internet, not the local
// filesystem).
//
// Palette follows the green AL-LÍO style guide used by the login and
// landing (issue #264, #265, #288): green #1F5B46 for the accent and
// buttons, warm ink #2F2A24, cream #F7F3EC ground, #E6DED2 hairlines. No
// orange.
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const FOOTER_LINE = "Proyecto desarrollado gracias a la beca Aircury Summer of Code 2026 de Aircury SL.";

// A single centered button. Email clients (Outlook especially) don't
// reliably center a bare <table> via margin:auto, so the standard,
// widely-compatible pattern is a full-width outer table with align="center"
// on its cell, wrapping an auto-width inner table for the pill shape.
function centeredButton(href: string, label: string, variant: "solid" | "outline" = "solid"): string {
  const style =
    variant === "solid"
      ? "background:#1F5B46;color:#ffffff;"
      : "background:#ffffff;color:#2F2A24;border:1px solid #E6DED2;";
  return `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:8px 0;">
        <table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="border-radius:10px;${style}">
          <a href="${href}" style="display:inline-block;padding:14px 32px;${style}text-decoration:none;font-weight:700;font-size:16px;">${label}</a>
        </td></tr></table>
      </td></tr></table>`;
}

function baseLayout(bodyHtml: string): string {
  const logoUrl = absolutePublicAssetUrl("/assets/al_lio_wordmark.png");

  return `<!doctype html>
<html lang="es">
  <body style="margin:0;padding:0;background:#F7F3EC;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F7F3EC;padding:40px 16px;">
      <tr><td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 12px 32px rgba(40,40,30,0.06);">
          <tr><td style="height:3px;background:#1F5B46;font-size:0;line-height:0;">&nbsp;</td></tr>
          <tr><td style="padding:36px 44px 26px;text-align:center;border-bottom:1px solid #E6DED2;">
            <img src="${logoUrl}" alt="AL-LÍO" width="150" style="display:block;margin:0 auto;height:auto;max-width:150px;" />
          </td></tr>
          <tr><td style="padding:36px 44px;">
            ${bodyHtml}
          </td></tr>
          <tr><td style="padding:22px 44px 36px;border-top:1px solid #E6DED2;">
            <p style="font-size:13px;color:#7A736B;line-height:1.7;margin:0 0 12px;">Si no esperabas este correo, puedes ignorarlo con seguridad.</p>
            <p style="font-size:13px;color:#9a9589;line-height:1.7;margin:0;">${FOOTER_LINE}</p>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;
}

export function confirmEmailTemplate(email: string, confirmUrl: string): { subject: string; html: string; text: string } {
  const safeEmail = escapeHtml(email);
  return {
    subject: "Confirma tu cuenta en AL-LÍO",
    html: baseLayout(`
      <p style="font-size:17px;line-height:1.6;margin:0 0 14px;color:#2F2A24;">Hola,</p>
      <p style="font-size:17px;line-height:1.6;margin:0 0 28px;color:#2F2A24;">Confirma que <strong>${safeEmail}</strong> es tu correo para activar tu cuenta en AL-LÍO.</p>
      ${centeredButton(confirmUrl, "Confirmar mi cuenta")}
      <p style="font-size:14px;color:#7A736B;line-height:1.6;margin:28px 0 0;text-align:center;">Este enlace caduca en 24 horas y solo se puede usar una vez.</p>
    `),
    text: `Hola,\n\nConfirma que ${email} es tu correo para activar tu cuenta en AL-LÍO abriendo este enlace:\n${confirmUrl}\n\nEste enlace caduca en 24 horas y solo se puede usar una vez.\n\nSi no esperabas este correo, puedes ignorarlo con seguridad.\n\n${FOOTER_LINE}`,
  };
}

export function passwordResetTemplate(email: string, resetUrl: string): { subject: string; html: string; text: string } {
  const safeEmail = escapeHtml(email);
  return {
    subject: "Recupera tu contraseña de AL-LÍO",
    html: baseLayout(`
      <p style="font-size:17px;line-height:1.6;margin:0 0 14px;color:#2F2A24;">Hola,</p>
      <p style="font-size:17px;line-height:1.6;margin:0 0 28px;color:#2F2A24;">Hemos recibido una solicitud para restablecer la contraseña de <strong>${safeEmail}</strong>.</p>
      ${centeredButton(resetUrl, "Restablecer contraseña")}
      <p style="font-size:14px;color:#7A736B;line-height:1.6;margin:28px 0 0;text-align:center;">Este enlace caduca en 1 hora y solo se puede usar una vez. Al completarlo, se cerrará el acceso en cualquier otro dispositivo.</p>
    `),
    text: `Hola,\n\nHemos recibido una solicitud para restablecer la contraseña de ${email}. Abre este enlace para continuar:\n${resetUrl}\n\nEste enlace caduca en 1 hora y solo se puede usar una vez. Al completarlo, se cerrará el acceso en cualquier otro dispositivo.\n\nSi no esperabas este correo, puedes ignorarlo con seguridad.\n\n${FOOTER_LINE}`,
  };
}

export function alreadyRegisteredTemplate(loginUrl: string, resetUrl: string): { subject: string; html: string; text: string } {
  return {
    subject: "Alguien ha intentado registrarse con tu correo en AL-LÍO",
    html: baseLayout(`
      <p style="font-size:17px;line-height:1.6;margin:0 0 14px;color:#2F2A24;">Hola,</p>
      <p style="font-size:17px;line-height:1.6;margin:0 0 28px;color:#2F2A24;">Ya tienes una cuenta en AL-LÍO con este correo. Si has sido tú, puedes iniciar sesión o recuperar tu contraseña.</p>
      ${centeredButton(loginUrl, "Iniciar sesión")}
      ${centeredButton(resetUrl, "Recuperar contraseña", "outline")}
      <p style="font-size:14px;color:#7A736B;line-height:1.6;margin:28px 0 0;text-align:center;">Si no has sido tú, puedes ignorar este mensaje con seguridad.</p>
    `),
    text: `Hola,\n\nYa tienes una cuenta en AL-LÍO con este correo.\n\nIniciar sesión: ${loginUrl}\nRecuperar contraseña: ${resetUrl}\n\nSi no has sido tú, puedes ignorar este mensaje con seguridad.\n\n${FOOTER_LINE}`,
  };
}
