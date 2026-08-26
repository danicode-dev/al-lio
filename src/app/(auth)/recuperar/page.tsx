import { AuthPageShell } from "@/components/auth/auth-page-shell";
import { RequestResetForm } from "@/components/auth/request-reset-form";

export default function RequestResetPage() {
  return (
    <AuthPageShell>
      <RequestResetForm />
    </AuthPageShell>
  );
}
