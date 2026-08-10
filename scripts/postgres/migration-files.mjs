import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

export const BASELINE_VERSION = "0001_initial_schema";

export function loadMigrationFiles(root = process.cwd()) {
  const files = [
    {
      version: BASELINE_VERSION,
      path: join(root, "infra", "postgres", "schema.sql"),
      baseline: true,
    },
  ];

  const migrationsDir = join(root, "infra", "postgres", "migrations");
  if (existsSync(migrationsDir)) {
    for (const name of readdirSync(migrationsDir).sort()) {
      if (!/^\d{4}_[a-z0-9_]+\.sql$/.test(name)) continue;
      const version = name.slice(0, -4);
      if (version === BASELINE_VERSION) continue;
      files.push({ version, path: join(migrationsDir, name), baseline: false });
    }
  }

  const seen = new Set();
  return files.map((migration) => {
    if (!existsSync(migration.path)) {
      throw new Error(`No existe la migración ${migration.version}: ${migration.path}`);
    }
    if (seen.has(migration.version)) {
      throw new Error(`Versión de migración duplicada: ${migration.version}`);
    }
    seen.add(migration.version);
    const sql = readFileSync(migration.path, "utf8");
    const normalizedSql = sql.replace(/\r\n/g, "\n");
    const checksum = createHash("sha256").update(normalizedSql).digest("hex");
    if (migration.baseline) {
      const expectedChecksum = readFileSync(
        join(root, "infra", "postgres", "baseline.sha256"),
        "utf8",
      ).trim();
      if (checksum !== expectedChecksum) {
        throw new Error(
          "El baseline infra/postgres/schema.sql ha cambiado. Crea una migración nueva en lugar de editar 0001_initial_schema.",
        );
      }
    }
    return {
      ...migration,
      sql,
      checksum,
    };
  });
}
