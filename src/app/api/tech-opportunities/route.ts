import { NextResponse } from "next/server";

import { tryGetCurrentUserId } from "@/lib/auth/current-user";
import type { DbTechOpportunity } from "@/lib/db/types";
import { getAllTechOpportunities } from "@/lib/db/repositories/tech_opportunities";
import type { TechOpportunity } from "@/lib/tech-opportunities/tech-opportunity-types";

// The verified/legacy tech-opportunity catalogue. Its consumer lives inside the
// authenticated product, so this route now requires a validated AL-LÍO session,
// returns an explicit projection that matches the `TechOpportunity` contract -
// never the raw database row shape - and is not publicly cacheable (issue #282).
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Explicit response projection. Selecting each field by name keeps a future
// column added to `tech_opportunities` from leaking through the API boundary.
function toTechOpportunity(row: DbTechOpportunity): TechOpportunity {
  return {
    id: row.id,
    id_slug: row.id_slug,
    categoria: row.categoria,
    nombre: row.nombre,
    entidad: row.entidad,
    area_o_tipo: row.area_o_tipo,
    modalidad: row.modalidad,
    localidad: row.localidad,
    provincia: row.provincia,
    fecha_inicio: row.fecha_inicio,
    fecha_fin: row.fecha_fin,
    estado: row.estado,
    certificacion_o_premio: row.certificacion_o_premio,
    practicas_empresa: row.practicas_empresa,
    horas_totales: row.horas_totales,
    horas_practicas: row.horas_practicas,
    coste: row.coste,
    requisitos_resumen: row.requisitos_resumen,
    encaje_daw_1_5: row.encaje_daw_1_5,
    prioridad: row.prioridad,
    tags: row.tags,
    fuente_url: row.fuente_url,
    ultima_revision: row.ultima_revision,
    notas: row.notas,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export async function GET() {
  const userId = await tryGetCurrentUserId();
  if (!userId) {
    return NextResponse.json(
      { error: "unauthorized" },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }

  const rows = await getAllTechOpportunities();
  return NextResponse.json(rows.map(toTechOpportunity), {
    headers: { "Cache-Control": "private, no-store" },
  });
}
