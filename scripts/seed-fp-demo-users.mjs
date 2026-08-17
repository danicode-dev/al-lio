import pg from "pg";
import bcrypt from "bcryptjs";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const CONFIRMATION = "SEED_FP_DEMO_USERS";
const LOCAL_DEMO_PASSWORD = "local-al-lio-demo-only";

const DEMO_USERS = [
  {
    id: "10000000-0000-0000-0000-000000000001",
    email: "demo.dev@al-lio.test",
    displayName: "Demo Desarrollo",
    fullName: "Demo Desarrollo de Aplicaciones",
    targetRole: "Proyecto y portfolio digital",
    cycleCode: "DAW",
    cycleGroup: "DEV",
    academicYear: 2,
    interests: ["frontend", "backend", "portfolio", "hackathons"],
    skills: ["HTML", "CSS", "JavaScript", "Git"],
  },
  {
    id: "10000000-0000-0000-0000-000000000002",
    email: "demo.af@al-lio.test",
    displayName: "Demo Finanzas",
    fullName: "Demo Administracion y Finanzas",
    targetRole: "Gestion administrativa y financiera",
    cycleCode: "AF",
    cycleGroup: "AF",
    academicYear: 1,
    interests: ["contabilidad", "excel", "gestion", "empresa"],
    skills: ["Excel", "Contabilidad", "Facturacion"],
  },
  {
    id: "10000000-0000-0000-0000-000000000005",
    email: "demo.dam@al-lio.test",
    displayName: "Demo Multiplataforma",
    fullName: "Demo Desarrollo de Aplicaciones Multiplataforma",
    targetRole: "Desarrollo de aplicaciones moviles y multiplataforma",
    cycleCode: "DAM",
    cycleGroup: "DEV",
    academicYear: 2,
    interests: ["android", "kotlin", "multiplataforma", "iot"],
    skills: ["Kotlin", "Android", "SQL", "Git"],
  },
  {
    id: "10000000-0000-0000-0000-000000000003",
    email: "demo.tsaf@al-lio.test",
    displayName: "Demo TSAF",
    fullName: "Demo Acondicionamiento Fisico",
    targetRole: "Entrenamiento y servicios deportivos",
    cycleCode: "TSAF",
    cycleGroup: "TSAF",
    academicYear: 1,
    interests: ["fitness", "salud", "programacion", "cliente"],
    skills: ["Entrenamiento", "Planificacion", "Evaluacion fisica"],
  },
  {
    id: "10000000-0000-0000-0000-000000000004",
    email: "demo.mp@al-lio.test",
    displayName: "Demo Marketing",
    fullName: "Demo Marketing y Publicidad",
    targetRole: "Campanas, contenido y analitica",
    cycleCode: "MP",
    cycleGroup: "MP",
    academicYear: 2,
    interests: ["contenido", "analitica", "seo", "campanas"],
    skills: ["Canva", "Analytics", "Copywriting", "Social Ads"],
  },
];

function loadEnvLocal() {
  for (const file of [".env.local", ".env"]) {
    const envPath = join(ROOT, file);
    if (!existsSync(envPath)) continue;
    const lines = readFileSync(envPath, "utf-8").split(/\r?\n/);
    for (const raw of lines) {
      const line = raw.trim();
      if (!line || line.startsWith("#")) continue;
      const eq = line.indexOf("=");
      if (eq === -1) continue;
      const key = line.slice(0, eq).trim();
      const value = line.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
      if (!process.env[key]) process.env[key] = value;
    }
  }
}

function isLocalDatabase(databaseUrl) {
  try {
    const parsed = new URL(databaseUrl);
    return ["localhost", "127.0.0.1"].includes(parsed.hostname);
  } catch {
    return false;
  }
}

function getDemoPassword(databaseUrl) {
  const password = process.env.AL_LIO_DEMO_PASSWORD;
  if (password) return password;
  if (isLocalDatabase(databaseUrl)) return LOCAL_DEMO_PASSWORD;
  return "";
}

async function upsertDemoUser(client, demoUser, passwordHash) {
  const userRes = await client.query(
    `INSERT INTO public.users (id, email, display_name, role, password_hash)
     VALUES ($1, $2, $3, 'user', $4)
     ON CONFLICT (email) DO UPDATE SET
       display_name = excluded.display_name,
       role = excluded.role,
       password_hash = excluded.password_hash,
       updated_at = now()
     RETURNING id`,
    [demoUser.id, demoUser.email, demoUser.displayName, passwordHash]
  );

  const userId = userRes.rows[0].id;

  await client.query(
    `INSERT INTO public.profiles
       (user_id, full_name, display_name, target_role, main_location, skills,
        cycle_code, cycle_group, academic_year, interests, onboarding_completed_at, onboarding_version)
     VALUES ($1, $2, $3, $4, 'Granada', $5, $6, $7, $8, $9, now(), 1)
     ON CONFLICT (user_id) DO UPDATE SET
       full_name = excluded.full_name,
       display_name = excluded.display_name,
       target_role = excluded.target_role,
       main_location = excluded.main_location,
       skills = excluded.skills,
       cycle_code = excluded.cycle_code,
       cycle_group = excluded.cycle_group,
       academic_year = excluded.academic_year,
       interests = excluded.interests,
       onboarding_completed_at = excluded.onboarding_completed_at,
       onboarding_version = excluded.onboarding_version,
       updated_at = now()`,
    [
      userId,
      demoUser.fullName,
      demoUser.displayName,
      demoUser.targetRole,
      demoUser.skills,
      demoUser.cycleCode,
      demoUser.cycleGroup,
      demoUser.academicYear,
      demoUser.interests,
    ]
  );
}

async function main() {
  loadEnvLocal();

  if (process.env.AL_LIO_SEED_DEMO_CONFIRMATION !== CONFIRMATION) {
    console.error("ERROR: Refusing to seed demo users without explicit confirmation.");
    console.error(`Set AL_LIO_SEED_DEMO_CONFIRMATION=${CONFIRMATION}`);
    process.exit(1);
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("ERROR: DATABASE_URL is not defined.");
    process.exit(1);
  }

  const password = getDemoPassword(databaseUrl);
  if (!password || password.length < 12) {
    console.error("ERROR: AL_LIO_DEMO_PASSWORD must be at least 12 characters for non-local databases.");
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const client = new pg.Client({ connectionString: databaseUrl });
  await client.connect();

  try {
    await client.query("BEGIN");
    for (const demoUser of DEMO_USERS) {
      await upsertDemoUser(client, demoUser, passwordHash);
    }
    await client.query("COMMIT");

    console.log("OK: FP demo users seeded.");
    for (const demoUser of DEMO_USERS) {
      console.log(`- ${demoUser.email} (${demoUser.cycleGroup}, ${demoUser.academicYear} curso)`);
    }
    console.log("Password source: AL_LIO_DEMO_PASSWORD env var, or local-only default for localhost databases.");
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    console.error("ERROR:", error.message ?? error);
    process.exit(1);
  } finally {
    await client.end().catch(() => {});
  }
}

main().catch((error) => {
  console.error("Fatal:", error.message ?? error);
  process.exit(1);
});
