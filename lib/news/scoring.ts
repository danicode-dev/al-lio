import type { NewsCategory } from "@/lib/sources/source-registry";

/**
 * Scoring para el perfil de Al-Lio (estudiante DAW Granada).
 * Devuelve un número entero (puede ser negativo).
 */

const KW = (s: string) => s.toLowerCase();

const KEYWORDS = {
  granada: [KW("granada"), KW("ugr"), KW("granadina"), KW("granadino")],
  remoto: [KW("remoto"), KW("remote"), KW("teletrabajo"), KW("100% remoto")],
  junior: [
    KW("prácticas"), KW("practicas"), KW("internship"), KW("becario"), KW("becaria"),
    KW("trainee"), KW("junior"), KW("fp"), KW("formación profesional"), KW("formacion profesional"),
    KW("daw"), KW("dam"),
  ],
  stack: [
    KW("java"), KW("sql"), KW("mysql"), KW("postgres"), KW("postgresql"),
    KW("react"), KW("next.js"), KW("nextjs"), KW("typescript"), KW("javascript"),
    KW("python"), KW("power bi"), KW("powerbi"), KW("data analyst"), KW("analista de datos"),
    KW("backend"), KW("frontend"), KW("full stack"), KW("fullstack"),
  ],
  formacion: [KW("ugr"), KW("formación"), KW("formacion"), KW("beca"), KW("becas"), KW("hackathon"), KW("hackatón"), KW("curso")],
  empresaTech: [
    KW("sidn"), KW("nucleoo"), KW("trevenque"), KW("kyndryl"),
    KW("cívica"), KW("civica"), KW("experian"), KW("salesforce"),
  ],
  economia: [KW("economía"), KW("economia"), KW("empleo"), KW("emprendimiento"), KW("ayudas"), KW("subvenciones")],
  senior: [KW("senior"), KW("lead "), KW("principal"), KW("staff engineer"), KW("arquitecto/a")],
  longExp: [
    KW("5+ años"), KW("5 años de experiencia"), KW("6+ años"), KW("7+ años"), KW("8+ años"),
    KW("10+ años"), KW("10 años de experiencia"), KW("more than 5 years"), KW("5+ years"),
  ],
};

function includesAny(haystack: string, needles: string[]): boolean {
  return needles.some((n) => haystack.includes(n));
}

export function scoreNews(
  title: string,
  description: string | undefined,
  category: NewsCategory,
  tags: string[] = [],
): number {
  const text = `${title} ${description ?? ""} ${tags.join(" ")}`.toLowerCase();
  let score = 0;

  if (includesAny(text, KEYWORDS.granada)) score += 30;
  if (includesAny(text, KEYWORDS.remoto) && (category === "jobs" || category === "companies"))
    score += 25;
  if (includesAny(text, KEYWORDS.junior)) score += 25;
  if (includesAny(text, KEYWORDS.stack)) score += 20;
  if (includesAny(text, KEYWORDS.formacion)) score += 15;
  if (includesAny(text, KEYWORDS.empresaTech)) score += 15;
  if (includesAny(text, KEYWORDS.economia)) score += 10;

  if (includesAny(text, KEYWORDS.senior) && !includesAny(text, KEYWORDS.junior)) score -= 15;
  if (includesAny(text, KEYWORDS.longExp)) score -= 20;

  // Bonificación por categoría afín al perfil
  if (category === "granada") score += 10;
  if (category === "programming") score += 8;
  if (category === "jobs") score += 5;
  if (category === "hackathons") score += 8;

  // Si nada de lo anterior aplica → puntuación muy negativa para que pase al fondo
  if (score === 0) score = -30;

  return score;
}

export function extractTags(title: string, description?: string): string[] {
  const text = `${title} ${description ?? ""}`.toLowerCase();
  const candidates = [
    "granada", "ugr", "remoto", "java", "sql", "mysql", "postgresql",
    "react", "next.js", "typescript", "python", "javascript",
    "frontend", "backend", "fullstack", "data", "power bi",
    "junior", "prácticas", "internship", "fp", "daw",
    "hackathon", "beca", "ai", "ia", "machine learning",
  ];
  const found = new Set<string>();
  for (const c of candidates) {
    if (text.includes(c)) found.add(c.replace(".", ""));
  }
  return Array.from(found).slice(0, 6);
}
