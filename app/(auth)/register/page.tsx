import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { signUp } from "@/lib/actions";

export default function RegisterPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Crear cuenta</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={signUp} className="space-y-3">
            <Input name="display_name" placeholder="Nombre" defaultValue="Dani" />
            <Input name="email" type="email" placeholder="Email" required />
            <Input name="password" type="password" placeholder="Password" required minLength={6} />
            <Button className="w-full">Crear cuenta</Button>
          </form>
          <Link href="/login" className="mt-4 block text-sm text-muted-foreground hover:text-foreground">
            Ya tengo cuenta
          </Link>
        </CardContent>
      </Card>
    </main>
  );
}
