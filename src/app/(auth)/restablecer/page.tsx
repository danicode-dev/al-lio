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
        <div className="space-y-3 text-center">
          <h1 className="text-xl font-bold">Enlace no válido</h1>
          <p className="text-sm text-muted-foreground">Falta el token de restablecimiento en el enlace.</p>
          <Link href="/recuperar" className="text-sm font-medium text-primary underline underline-offset-4">
            Solicitar un nuevo enlace
          </Link>
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
