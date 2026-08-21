import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { getProfileByUser } from "@/lib/db/repositories/profiles";
import { getCycleSkills } from "@/lib/db/repositories/fp_catalog";
import { buildRutaPathSteps } from "@/lib/fp/ruta-path";
import { RutaPathView } from "@/components/ruta/ruta-path-view";

export const dynamic = "force-dynamic";

export default async function RoadmapModulePage({
  params,
  searchParams,
}: {
  params: Promise<{ modulo: string }>;
  searchParams: Promise<{ paso?: string }>;
}) {
  const { modulo } = await params;
  const { paso } = await searchParams;
  const session = await getSession();
  if (!session) redirect("/login");

  const profile = await getProfileByUser(session.uid);
  if (!profile?.cycle_code || !profile.cycle_group) notFound();

  const cycleSkills = await getCycleSkills(profile.cycle_code);
  const moduleSkills = cycleSkills
    .filter((skill) => (skill.modulo_codigo ?? "sin-modulo") === modulo)
    .sort((a, b) => a.orden_global - b.orden_global);

  if (moduleSkills.length === 0) notFound();

  const moduleName = moduleSkills[0].modulo_nombre ?? "Módulo";

  const steps = await buildRutaPathSteps(
    session.uid,
    moduleSkills.map((skill) => ({
      id: skill.id,
      titulo: skill.titulo,
      descripcion: skill.descripcion,
      obligatoria: skill.obligatoria_roadmap_base,
    })),
    profile.cycle_code
  );

  const requestedIndex = paso ? steps.findIndex((step) => step.competencyId === paso) : 0;

  return (
    <RutaPathView pageTitle={moduleName} steps={steps} initialStepIndex={requestedIndex >= 0 ? requestedIndex : 0} />
  );
}
