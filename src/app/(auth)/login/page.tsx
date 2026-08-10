import { LoginForm } from "@/components/auth/login-form";
import { isDemoAccessEnabled } from "@/lib/auth/demo-access";

type LoginPageProps = {
  searchParams: Promise<{
    error?: string;
    google?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  return <LoginForm error={params.error ?? params.google} demoAccessEnabled={isDemoAccessEnabled()} />;
}
