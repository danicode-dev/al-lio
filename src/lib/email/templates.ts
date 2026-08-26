// Plain, safe HTML templates - no external assets, no user-supplied free
// text beyond the recipient's own (defensively escaped) email address, so
// there is no email-body injection surface. Confirmation/reset links are
// server-generated absolute URLs, not user input.
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function baseLayout(bodyHtml: string): string {
  return `<!doctype html>
<html lang="es">
  <body style="margin:0;padding:32px 16px;background:#F5F2EC;font-family:Arial,Helvetica,sans-serif;color:#111111;">
    <table role="presentation" width="100%" style="max-width:480px;margin:0 auto;background:#ffffff;border-radius:16px;padding:32px;">
      <tr><td>
        <p style="font-size:18px;font-weight:700;margin:0 0 20px;color:#E15D2D;">AL-LÍO</p>
        ${bodyHtml}
        <p style="font-size:12px;color:#9a9589;margin-top:32px;">Si no esperabas este correo, puedes ignorarlo con seguridad.</p>
      </td></tr>
    </table>
  </body>
</html>`;
}

export function confirmEmailTemplate(email: string, confirmUrl: string): { subject: string; html: string } {
  return {
    subject: "Confirma tu cuenta en AL-LÍO",
    html: baseLayout(`
      <p style="font-size:15px;line-height:1.5;">Hola,</p>
      <p style="font-size:15px;line-height:1.5;">Confirma que <strong>${escapeHtml(email)}</strong> es tu correo para activar tu cuenta en AL-LÍO.</p>
      <p style="margin:24px 0;"><a href="${confirmUrl}" style="display:inline-block;background:#E15D2D;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:10px;font-weight:600;font-size:14px;">Confirmar mi cuenta</a></p>
      <p style="font-size:13px;color:#6b6f72;line-height:1.5;">Este enlace caduca en 24 horas y solo se puede usar una vez.</p>
    `),
  };
}

export function passwordResetTemplate(email: string, resetUrl: string): { subject: string; html: string } {
  return {
    subject: "Recupera tu contraseña de AL-LÍO",
    html: baseLayout(`
      <p style="font-size:15px;line-height:1.5;">Hola,</p>
      <p style="font-size:15px;line-height:1.5;">Hemos recibido una solicitud para restablecer la contraseña de <strong>${escapeHtml(email)}</strong>.</p>
      <p style="margin:24px 0;"><a href="${resetUrl}" style="display:inline-block;background:#E15D2D;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:10px;font-weight:600;font-size:14px;">Restablecer contraseña</a></p>
      <p style="font-size:13px;color:#6b6f72;line-height:1.5;">Este enlace caduca en 1 hora y solo se puede usar una vez. Al completarlo, se cerrará el acceso en cualquier otro dispositivo.</p>
    `),
  };
}
