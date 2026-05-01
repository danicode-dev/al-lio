/**
 * Seed pending weekly tasks into Supabase for the dashboard.
 *
 * Usage:
 *   npm run seed:tasks
 *
 * Requires in .env.local:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SECRET_KEY
 *   TARGET_USER_EMAIL
 *
 * The script finds the user by email, skips tasks already inserted by title,
 * and inserts only the missing tasks.
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
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
const USER_EMAIL = process.env.TARGET_USER_EMAIL;

if (!SUPABASE_URL || !SERVICE_KEY || !USER_EMAIL) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY/SUPABASE_SECRET_KEY, or TARGET_USER_EMAIL in .env.local");
  process.exit(1);
}

const TASKS = [
  {
    title: "Supabase: aplicar migraciones V1 pendientes",
    description:
      "Ejecutar en Supabase SQL Editor, en este orden:\n" +
      "1. supabase/migrations/align_tasks_persistence.sql\n" +
      "2. supabase/migrations/extend_courses_hackathons.sql\n" +
      "3. supabase/migrations/create_tech_opportunities.sql\n\n" +
      "Estas migraciones alinean tareas, cursos, hackathons y oportunidades tech con el codigo actual.",
    category: "semanal",
    priority: "alta",
    status: "pendiente",
  },
  {
    title: "Supabase: importar CSV completos",
    description:
      "Despues de aplicar las migraciones:\n" +
      "npm run import:courses\n" +
      "npm run import:hackathons\n" +
      "npm run import:opportunities\n\n" +
      "Los scripts son idempotentes: se pueden ejecutar varias veces sin duplicar registros.",
    category: "semanal",
    priority: "alta",
    status: "pendiente",
  },
  {
    title: "Supabase: verificar persistencia V1",
    description:
      "Ejecutar:\n" +
      "npm run supabase:check\n" +
      "npm run verify:cheap\n\n" +
      "Luego abrir la app y crear/editar una tarea. Al cerrar sesion o reiniciar la app, la tarea debe seguir en Supabase.",
    category: "semanal",
    priority: "media",
    status: "pendiente",
  },
];

async function main() {
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false },
  });

  const { data: usersData, error: usersError } = await supabase.auth.admin.listUsers();
  if (usersError) {
    console.error("Error listing users:", usersError.message);
    process.exit(1);
  }

  const user = usersData.users.find((item) => item.email?.toLowerCase() === USER_EMAIL.toLowerCase());
  if (!user) {
    console.error(`User not found for TARGET_USER_EMAIL=${USER_EMAIL}`);
    process.exit(1);
  }

  console.log(`Target user: ${user.email}`);

  const { data: existing, error: existingError } = await supabase
    .from("tasks")
    .select("title")
    .eq("user_id", user.id);

  if (existingError) {
    console.error("Error reading existing tasks:", existingError.message);
    process.exit(1);
  }

  const existingTitles = new Set((existing || []).map((task) => task.title));
  console.log(`Existing tasks: ${existingTitles.size}`);

  let inserted = 0;
  let skipped = 0;

  for (const task of TASKS) {
    if (existingTitles.has(task.title)) {
      console.log(`Skipped existing: ${task.title}`);
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
      console.error(`Error inserting "${task.title}": ${error.message}`);
      process.exitCode = 1;
    } else {
      console.log(`Inserted: ${task.title}`);
      inserted++;
    }
  }

  console.log("-".repeat(50));
  console.log(`Inserted: ${inserted}`);
  console.log(`Skipped: ${skipped}`);
}

main().catch((error) => {
  console.error("Fatal:", error);
  process.exit(1);
});
