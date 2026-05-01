import { createClient } from "@supabase/supabase-js";
import { getTargetUserEmail, loadEnvLocal, requireSupabaseAdminEnv } from "./supabase-env.mjs";

const checks = [
  {
    table: "tasks",
    columns: ["id", "user_id", "title", "status", "priority", "due_date", "progress_notes", "reminder_at", "created_at"],
  },
  {
    table: "courses",
    columns: ["id", "user_id", "title", "platform", "url", "status", "deadline", "notes", "created_at"],
    extendedColumns: ["id_slug", "entidad", "modalidad", "localidad", "provincia", "encaje_daw_1_5", "prioridad", "tags", "fuente_url"],
  },
  {
    table: "hackathons",
    columns: ["id", "user_id", "name", "organizer", "province", "city", "status", "priority", "url", "notes", "created_at"],
    extendedColumns: ["id_slug", "modalidad", "localidad", "inscripcion_hasta", "certificacion_o_premio", "encaje_daw_1_5", "tags"],
  },
  {
    table: "opportunities",
    columns: ["id", "user_id", "source", "title", "url", "status", "created_at"],
  },
  {
    table: "quick_links",
    columns: ["id", "user_id", "name", "url", "category", "created_at"],
  },
  {
    table: "tech_opportunities",
    columns: ["id", "id_slug", "categoria", "nombre", "prioridad", "fecha_inicio", "fuente_url", "updated_at"],
  },
];

function formatColumns(columns) {
  return columns.join(",");
}

async function checkColumns(supabase, table, columns, required) {
  const { error } = await supabase.from(table).select(formatColumns(columns)).limit(1);
  if (!error) return { ok: true };

  return {
    ok: false,
    required,
    message: error.message,
  };
}

async function findUser(supabase) {
  if (!TARGET_USER_EMAIL) return { ok: false, message: "TARGET_USER_EMAIL no definido en .env.local" };

  const { data, error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (error) return { ok: false, message: error.message };

  const user = (data?.users ?? []).find((item) => item.email?.toLowerCase() === TARGET_USER_EMAIL.toLowerCase());
  if (!user) return { ok: false, message: `No existe usuario ${TARGET_USER_EMAIL}` };
  return { ok: true, id: user.id };
}

loadEnvLocal();
const TARGET_USER_EMAIL = getTargetUserEmail();
const { supabaseUrl, adminKey } = requireSupabaseAdminEnv();
const supabase = createClient(supabaseUrl, adminKey, { auth: { persistSession: false } });

let failedRequired = 0;
let failedExtended = 0;

console.log("Supabase remote check");
console.log(`Project URL: ${new URL(supabaseUrl).host}`);

const user = await findUser(supabase);
if (user.ok) {
  console.log(`OK auth user: ${TARGET_USER_EMAIL}`);
} else {
  failedRequired += 1;
  console.log(`ERROR auth user: ${user.message}`);
}

for (const check of checks) {
  const required = await checkColumns(supabase, check.table, check.columns, true);
  if (required.ok) {
    console.log(`OK table ${check.table}: required columns available`);
  } else {
    failedRequired += 1;
    console.log(`ERROR table ${check.table}: ${required.message}`);
    continue;
  }

  if (check.extendedColumns?.length) {
    const extended = await checkColumns(supabase, check.table, check.extendedColumns, false);
    if (extended.ok) {
      console.log(`OK table ${check.table}: extended columns available`);
    } else {
      failedExtended += 1;
      console.log(`WARN table ${check.table}: extended columns missing (${extended.message})`);
    }
  }
}

if (failedRequired) {
  console.log(`Remote check failed: ${failedRequired} required check(s) failed.`);
  process.exit(1);
}

if (failedExtended) {
  console.log(`Remote check completed with ${failedExtended} extended schema warning(s). Apply migrations to unlock full CSV fields.`);
} else {
  console.log("Remote check completed: required and extended schema available.");
}
