import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import pg from "pg";

const { Client } = pg;
const connectionString = process.env.DATABASE_MIGRATION_URL ?? process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_MIGRATION_URL o DATABASE_URL es obligatorio");

const catalog = JSON.parse(await readFile(resolve("data/learning-competencies.json"), "utf8"));
const client = new Client({ connectionString, application_name: "al-lio-learning-import" });
await client.connect();

try {
  await client.query("BEGIN");

  for (const resource of catalog.resources) {
    await client.query(
      `INSERT INTO public.fp_learning_resources
         (id, slug, title, description, provider, language, level, youtube_url,
          duration_seconds, review_status, reviewed_at, reviewed_by, review_reason, is_active)
       VALUES ($1,$2,$3,$4,$5,'es',$6,$7,$8,'approved',$9,$10,$11,true)
       ON CONFLICT (id) DO UPDATE SET
         slug=excluded.slug, title=excluded.title, description=excluded.description,
         provider=excluded.provider, language=excluded.language, level=excluded.level,
         youtube_url=excluded.youtube_url, duration_seconds=excluded.duration_seconds,
         review_status=excluded.review_status, reviewed_at=excluded.reviewed_at,
         reviewed_by=excluded.reviewed_by, review_reason=excluded.review_reason, is_active=true`,
      [
        resource.id,
        resource.slug,
        resource.title,
        resource.description,
        resource.provider,
        resource.level,
        resource.youtubeUrl,
        resource.durationSeconds ?? null,
        catalog.reviewedAt,
        catalog.reviewedBy,
        "Vídeo en español, enlace activo, canal coincidente y encaje temático revisado para esta competencia.",
      ],
    );
  }

  for (const competency of catalog.competencies) {
    await client.query(
      `INSERT INTO public.fp_learning_competencies
         (id, cycle_code, slug, title, description, requirement, sort_order, is_active)
       VALUES ($1,$2,$3,$4,$5,$6,$7,true)
       ON CONFLICT (id) DO UPDATE SET
         cycle_code=excluded.cycle_code, slug=excluded.slug, title=excluded.title,
         description=excluded.description, requirement=excluded.requirement,
         sort_order=excluded.sort_order, is_active=true`,
      [competency.id, competency.cycleCode, competency.slug, competency.title, competency.description, competency.requirement, competency.sortOrder],
    );

    await client.query(
      `DELETE FROM public.fp_learning_competency_resources
       WHERE competency_id=$1 AND NOT (resource_id = ANY($2::text[]))`,
      [competency.id, competency.resourceIds],
    );

    for (const [index, resourceId] of competency.resourceIds.entries()) {
      await client.query(
        `INSERT INTO public.fp_learning_competency_resources
           (competency_id, resource_id, sort_order, is_featured)
         VALUES ($1,$2,$3,$4)
         ON CONFLICT (competency_id, resource_id) DO UPDATE SET
           sort_order=excluded.sort_order, is_featured=excluded.is_featured`,
        [competency.id, resourceId, index + 1, index === 0],
      );
    }
  }

  await client.query(
    `UPDATE public.fp_learning_competencies SET is_active=false
     WHERE NOT (id = ANY($1::text[]))`,
    [catalog.competencies.map((item) => item.id)],
  );
  await client.query(
    `UPDATE public.fp_learning_resources SET is_active=false
     WHERE NOT (id = ANY($1::text[]))`,
    [catalog.resources.map((item) => item.id)],
  );

  await client.query("COMMIT");
  console.log(`OK: ${catalog.competencies.length} competencias y ${catalog.resources.length} recursos importados.`);
} catch (error) {
  await client.query("ROLLBACK");
  throw error;
} finally {
  await client.end();
}
