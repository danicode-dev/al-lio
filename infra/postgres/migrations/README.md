# Migraciones PostgreSQL

`infra/postgres/schema.sql` es la migración inmutable `0001_initial_schema`.

Toda evolución posterior se añade aquí con nombres ordenados y únicos:

```text
0002_add_example.sql
0003_add_example_index.sql
```

Reglas:

- no editar una migración ya aplicada;
- usar cambios compatibles hacia delante (`expand/contract`);
- evitar `DROP`, `TRUNCATE` y conversiones destructivas;
- separar catálogos/fixtures de cambios estructurales;
- probar primero sobre una restauración de producción;
- ejecutar con `DATABASE_MIGRATION_URL`, nunca con la credencial de runtime.
