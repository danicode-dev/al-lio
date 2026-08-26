import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthPageShell } from "@/components/auth/auth-page-shell";
import { confirmEmailToken } from "@/lib/auth/email-confirmation";

type ConfirmPageProps = {
  searchParams: Promise<{ token?: string }>;
};

const messageByResult: Record<string, { title: string; body: string }> = {
  invalid: { title: "Enlace no válido", body: "Este enlace de confirmación no es válido." },
  expired: { title: "Enlace caducado", body: "Este enlace de confirmación ha caducado. Regístrate de nuevo para recibir uno nuevo." },
  already_used: { title: "Enlace ya utilizado", body: "Este enlace de confirmación ya se ha usado. Si ya confirmaste tu cuenta, inicia sesión." },
};

export default async function ConfirmEmailPage({ searchParams }: ConfirmPageProps) {
  const { token } = await searchParams;
  const result = await confirmEmailToken(token);

  if (result === "confirmed") {
    redirect("/dashboard");
  }

  const message = messageByResult[result];
  return (
    <AuthPageShell>
      <div className="space-y-3 text-center">
        <h1 className="text-xl font-bold">{message.title}</h1>
        <p className="text-sm text-muted-foreground">{message.body}</p>
        <Link href="/login" className="text-sm font-medium text-primary underline underline-offset-4">
          Ir a inicio de sesión
        </Link>
      </div>
    </AuthPageShell>
  );
}
