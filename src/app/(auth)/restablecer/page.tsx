import Link from "next/link";
import { AuthPageShell } from "@/components/auth/auth-page-shell";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { inspectAuthToken, type AuthTokenState } from "@/lib/auth/tokens";

type ResetPageProps = {
  searchParams: Promise<{ token?: string }>;
};

// Shown for a missing, invented, expired or already-used link so the user
// never fills in and submits a password form that cannot succeed (issue #272).
function DeadLinkNote({ title, detail }: { title: string; detail: string }) {
  return (
    <AuthPageShell>
      <div className="auth-note">
        <h1 className="auth-heading">{title}</h1>
        <p className="auth-sub">{detail}</p>
        <p className="auth-alt">
          <Link href="/recuperar">Solicitar un enlace nuevo</Link>
        </p>
      </div>
    </AuthPageShell>
  );
}

export default async function ResetPasswordPage({ searchParams }: ResetPageProps) {
  const { token } = await searchParams;

  if (!token) {
    return <DeadLinkNote title="Enlace no válido" detail="Falta el token de restablecimiento en el enlace." />;
  }

  let tokenStatus: AuthTokenState["status"];
  try {
    tokenStatus = (await inspectAuthToken(token, "password_reset")).status;
  } catch {
    // The token store is unreachable. Rendering the form would only fail on
    // submit, so invite a retry instead.
    return (
      <DeadLinkNote
        title="No podemos comprobar el enlace"
        detail="Vuelve a intentarlo en unos minutos o solicita un enlace nuevo."
      />
    );
  }

  if (tokenStatus === "expired") {
    return (
      <DeadLinkNote
        title="Enlace caducado"
        detail="Este enlace para restablecer la contraseña ha caducado. Los enlaces duran 1 hora."
      />
    );
  }
  if (tokenStatus === "already_used") {
    return (
      <DeadLinkNote
        title="Enlace ya utilizado"
        detail="Este enlace ya se usó para cambiar una contraseña. Si no fuiste tú, solicita uno nuevo."
      />
    );
  }
  if (tokenStatus !== "valid") {
    return (
      <DeadLinkNote
        title="Enlace no válido"
        detail="Este enlace para restablecer la contraseña no es válido."
      />
    );
  }

  return (
    <AuthPageShell>
      <ResetPasswordForm token={token} />
    </AuthPageShell>
  );
}
