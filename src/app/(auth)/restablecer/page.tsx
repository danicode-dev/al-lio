import Link from "next/link";
import { AuthPageShell } from "@/components/auth/auth-page-shell";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";

type ResetPageProps = {
  searchParams: Promise<{ token?: string }>;
};

export default async function ResetPasswordPage({ searchParams }: ResetPageProps) {
  const { token } = await searchParams;

  if (!token) {
    return (
      <AuthPageShell>
        <div className="auth-note">
          <h1 className="auth-heading">Enlace no válido</h1>
          <p className="auth-sub">Falta el token de restablecimiento en el enlace.</p>
          <p className="auth-alt">
            <Link href="/recuperar">Solicitar un nuevo enlace</Link>
          </p>
        </div>
      </AuthPageShell>
    );
  }

  return (
    <AuthPageShell>
      <ResetPasswordForm token={token} />
    </AuthPageShell>
  );
}
