import nextEnv from "@next/env";
import pg from "pg";

const { loadEnvConfig } = nextEnv;

const CONFIRMATION = "SEED_LOCAL_REVIEW_EVENT";
const EVENT_SLUG = "local-review-hackathon-2026";
const DEMO_USER_IDS = [
  "10000000-0000-0000-0000-000000000001",
  "10000000-0000-0000-0000-000000000002",
  "10000000-0000-0000-0000-000000000003",
  "10000000-0000-0000-0000-000000000004",
  "10000000-0000-0000-0000-000000000005",
];

loadEnvConfig(process.cwd(), true);

function isLocalDatabase(databaseUrl) {
  try {
    const { hostname } = new URL(databaseUrl);
    return ["localhost", "127.0.0.1", "::1"].includes(hostname);
  } catch {
    return false;
  }
}

async function main() {
  if (process.env.AL_LIO_SEED_LOCAL_REVIEW_EVENT !== CONFIRMATION) {
    throw new Error(`Set AL_LIO_SEED_LOCAL_REVIEW_EVENT=${CONFIRMATION} to seed the local review event`);
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl || !isLocalDatabase(databaseUrl)) {
    throw new Error("The review event can only be seeded into a localhost PostgreSQL database");
  }

  const client = new pg.Client({ connectionString: databaseUrl });
  await client.connect();

  try {
    await client.query("BEGIN");
    const users = await client.query(
      `SELECT id
       FROM public.users
       WHERE id = ANY($1::uuid[]) AND role = 'user'`,
      [DEMO_USER_IDS],
    );

    if (users.rowCount !== DEMO_USER_IDS.length) {
      throw new Error("All local demo profiles must exist before seeding the review event");
    }

    for (const { id: userId } of users.rows) {
      await client.query(
        `INSERT INTO public.hackathons
          (user_id, id_slug, categoria, name, organizer, province, city, type,
           modalidad, localidad, status, event_start_date, event_end_date,
           registration_deadline, inscripcion_hasta, certificacion_o_premio,
           practicas_empresa, encaje_daw_1_5, tags, ultima_revision, notes, priority)
         VALUES
          ($1, $2, 'hackathon_reto',
           'Reto Frontend Granada 2026 — Una web accesible para una causa local',
           'Granada Tech Community', 'Granada', 'Granada', 'Hackathon',
           'Híbrida', 'Granada / Online', 'inscripcion_abierta',
           '2026-09-18', '2026-09-20', '2026-09-12', '2026-09-12',
           'Mentoría, publicación del proyecto y acceso al demo day', false, 5,
           'HTML, CSS, JavaScript, accesibilidad, Git, portfolio', '2026-08-28',
           'Construye en equipo una landing responsive y accesible para una organización local. Durante 48 horas trabajarás desde el briefing hasta una demo navegable, documentando decisiones de diseño, accesibilidad y entrega con Git.',
           'alta')
         ON CONFLICT (user_id, id_slug) DO UPDATE SET
           categoria = excluded.categoria,
           name = excluded.name,
           organizer = excluded.organizer,
           province = excluded.province,
           city = excluded.city,
           type = excluded.type,
           modalidad = excluded.modalidad,
           localidad = excluded.localidad,
           status = excluded.status,
           event_start_date = excluded.event_start_date,
           event_end_date = excluded.event_end_date,
           registration_deadline = excluded.registration_deadline,
           inscripcion_hasta = excluded.inscripcion_hasta,
           certificacion_o_premio = excluded.certificacion_o_premio,
           practicas_empresa = excluded.practicas_empresa,
           encaje_daw_1_5 = excluded.encaje_daw_1_5,
           tags = excluded.tags,
           ultima_revision = excluded.ultima_revision,
           notes = excluded.notes,
           priority = excluded.priority,
           updated_at = now()`,
        [userId, EVENT_SLUG],
      );
    }

    await client.query("COMMIT");
    console.log(`OK: local review event seeded for ${users.rowCount} demo profiles.`);
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    await client.end().catch(() => undefined);
  }
}

main().catch((error) => {
  console.error(`ERROR: ${error instanceof Error ? error.message : "Local review event seed failed"}`);
  process.exit(1);
});
