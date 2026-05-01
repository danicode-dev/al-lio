/**
 * Seed pending weekly tasks into Supabase for the dashboard.
 *
 * Usage:
 *   node scripts/seed-semanal-tasks.mjs
 *
 * Requires in .env.local:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * The script finds the user by email, skips tasks already inserted (by title),
 * and inserts only the ones that are missing.
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

function loadEnvLocal() {
  const envPath = join(ROOT, ".env.local");
  if (!existsSync(envPath)) return;
  for (const raw of readFileSync(envPath, "utf-8").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    const val = line.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
    if (!process.env[key]) process.env[key] = val;
  }
}

loadEnvLocal();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;
const USER_EMAIL   = "webdaniel2025@gmail.com";

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("❌  Faltan NEXT_PUBLIC_SUPABASE_URL y/o SUPABASE_SERVICE_ROLE_KEY en .env.local");
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Pending tasks for the "semanal" bucket
// ---------------------------------------------------------------------------
const TASKS = [
  {
    title: "Aplicar migración SQL: tech_opportunities",
    description:
      "Ejecutar en el editor SQL de Supabase el fichero:\n" +
      "  supabase/migrations/create_tech_opportunities.sql\n\n" +
      "Crea la tabla tech_opportunities, 5 índices y la política RLS de lectura.\n" +
      "También activa el trigger updated_at.",
    category: "semanal",
    priority: "alta",
    status: "pendiente",
  },
  {
    title: "Importar CSV de oportunidades tech",
    description:
      "Ejecutar: npm run import:opportunities\n\n" +
      "Requiere SUPABASE_SERVICE_ROLE_KEY en .env.local.\n" +
      "Verifica los logs: registros leídos, lotes importados y errores.\n" +
      "Si todo OK, la sección 'Oportunidades tech' del dashboard carga datos desde Supabase.\n" +
      "Ejecutar N veces es seguro (upsert por id_slug).",
    category: "semanal",
    priority: "alta",
    status: "pendiente",
  },
  {
    title: "Verificar sección Oportunidades tech en producción",
    description:
      "Comprobar en el dashboard:\n" +
      "- Los filtros (Todos, Cursos, Hackathons, Alta, Granada, Online) funcionan.\n" +
      "- Botón Info expande el panel con coste, requisitos, horas, tags, notas.\n" +
      "- Botón Fuente abre la URL en nueva pestaña.\n" +
      "- Badges de Alta prioridad, DAW 5/5, Certificación y Prácticas visibles.\n" +
      "- Funciona en móvil (1 columna) y desktop (2 columnas).",
    category: "semanal",
    priority: "media",
    status: "pendiente",
  },
  {
    title: "Revisar métricas Lighthouse tras optimización de rendimiento",
    description:
      "Optimizaciones ya aplicadas en esta sesión:\n" +
      "- Font Inter con display:swap (evita bloqueo de render).\n" +
      "- useMemo para urgentTasks, weekEvents y upcomingHackathons en DashboardOperationalFeed.\n" +
      "- React.memo en DashboardTaskMiniCard, DashboardEventMiniCard, DashboardHackathonMiniCard.\n" +
      "- Cache 5 min en getTechOpportunities (evita refetch en cada render).\n" +
      "- Menos backdrop-blur en la cabecera móvil.\n\n" +
      "Pasos: abrir DevTools → Lighthouse → Performance. Anotar puntuación antes/después.\n" +
      "Si sigue lento: valorar dividir guest-app.tsx en sub-componentes con dynamic import.",
    category: "semanal",
    priority: "media",
    status: "pendiente",
  },
];

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false },
  });

  // Find user by email using admin API
  const { data: usersData, error: usersError } = await supabase.auth.admin.listUsers();
  if (usersError) {
    console.error("❌  Error listando usuarios:", usersError.message);
    process.exit(1);
  }

  const user = usersData.users.find((u) => u.email === USER_EMAIL);
  if (!user) {
    console.error(`❌  Usuario ${USER_EMAIL} no encontrado en auth.users`);
    process.exit(1);
  }

  console.log(`👤  Usuario: ${user.email} (${user.id})`);

  // Get existing task titles to avoid duplicates
  const { data: existing } = await supabase
    .from("tasks")
    .select("title")
    .eq("user_id", user.id);

  const existingTitles = new Set((existing || []).map((t) => t.title));
  console.log(`📋  Tareas existentes: ${existingTitles.size}`);

  let inserted = 0;
  let skipped = 0;

  for (const task of TASKS) {
    if (existingTitles.has(task.title)) {
      console.log(`   ↷ Ya existe: "${task.title}"`);
      skipped++;
      continue;
    }

    const { error } = await supabase.from("tasks").insert({
      user_id: user.id,
      title: task.title,
      description: task.description,
      category: task.category,
      priority: task.priority,
      status: task.status,
    });

    if (error) {
      console.error(`   ❌ Error insertando "${task.title}":`, error.message);
    } else {
      console.log(`   ✅ Insertada: "${task.title}"`);
      inserted++;
    }
  }

  console.log("─".repeat(50));
  console.log(`✅  Insertadas : ${inserted}`);
  console.log(`↷   Omitidas   : ${skipped}`);
  console.log("Done.");
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
