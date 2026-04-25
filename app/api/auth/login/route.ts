import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const { email, password, displayName } = await request.json();

  if (!email || !password) {
    return NextResponse.json({ error: "Email y contraseña son obligatorios" }, { status: 400 });
  }

  if (password.length < 4) {
    return NextResponse.json({ error: "La contraseña debe tener al menos 4 caracteres" }, { status: 400 });
  }

  const supabase = await createClient();

  // Paso 1: Intentar login
  const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });

  if (!signInError) {
    // Login correcto
    return NextResponse.json({ ok: true, registered: false });
  }

  // Paso 2: Si el login falla, comprobar si el usuario ya existe intentando registrar
  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { display_name: displayName, name: displayName } },
  });

  if (signUpError) {
    return NextResponse.json({ error: "Contraseña incorrecta" }, { status: 401 });
  }

  // Supabase devuelve un fake user (sin session) si el email ya existía
  // En ese caso, signUpData.user existe pero signUpData.session es null
  if (signUpData.user && !signUpData.session) {
    return NextResponse.json({ error: "Contraseña incorrecta" }, { status: 401 });
  }

  // Paso 3: Registro exitoso — crear perfil
  if (signUpData.user) {
    await supabase.from("profiles").upsert({
      user_id: signUpData.user.id,
      display_name: displayName || "Usuario",
      full_name: displayName || "Usuario",
      target_role: "Usuario D1OS",
      main_location: "Granada",
    });

    // Hacer login automático tras registro
    await supabase.auth.signInWithPassword({ email, password });
  }

  return NextResponse.json({ ok: true, registered: true });
}
