console.warn("setup-postgres-schema.mjs está deprecado; usando el runner seguro de migraciones.");
await import("./postgres/migrate.mjs");
