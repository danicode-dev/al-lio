import { createClient } from "@supabase/supabase-js";

// REQUIRES: SUPABASE_SERVICE_ROLE_KEY to bypass email confirmations
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Falta NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en el .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const defaultPassword = "muchosmantecados11";
const usersToCreate = [
  { email: "dani@d1os.com", displayName: "Dani" },
  { email: "luli@d1os.com", displayName: "Luli" },
  { email: "alberto@d1os.com", displayName: "Alberto" },
];

async function run() {
  console.log("Iniciando creación de usuarios Administradores...");

  for (const u of usersToCreate) {
    // Usar la admin API para no requerir confirmación de email
    const { data: user, error } = await supabase.auth.admin.createUser({
      email: u.email,
      password: defaultPassword,
      email_confirm: true, // Auto. Confirmado
      user_metadata: { display_name: u.displayName },
    });

    if (error) {
      console.error(`Error creando a ${u.displayName}:`, error.message);
    } else if (user?.user) {
      console.log(`✅ Creado: ${u.displayName} (${u.email})`);
      
      // Upsert profile for the user
      await supabase.from("profiles").upsert({
        user_id: user.user.id,
        display_name: u.displayName,
        full_name: u.displayName,
        target_role: "Desarrollador Web",
        main_location: "Granada"
      });
    }
  }
}

run();
