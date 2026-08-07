import type { NewsCategory } from "@/lib/sources/source-registry";

const KW = (s: string) => s.toLowerCase();

const KEYWORDS = {
  granada: [
    KW("granada"), KW("ugr"), KW("granadina"), KW("granadino"), KW("granada capital"),
    KW("armilla"), KW("motril"), KW("guadix"), KW("baza"), KW("loja"),
  ],
  ia: [
    KW("inteligencia artificial"), KW("ia "), KW(" ia"), KW("machine learning"),
    KW("deep learning"), KW("llm"), KW("gpt"), KW("gemini"), KW("claude"),
    KW("chatgpt"), KW("openai"), KW("modelo de lenguaje"), KW("neural network"),
    KW("pytorch"), KW("tensorflow"), KW("transformers"), KW("embeddings"),
    KW("computer vision"), KW("nlp"), KW("generative ai"), KW("ai "), KW(" ai"),
  ],
  cenia: [
    KW("cenia"), KW("hub de ia"), KW("hub ia granada"), KW("sede ia"),
    KW("inteligencia artificial granada"), KW("ia granada"),
  ],
  empresas: [
    KW("sidn"), KW("nucleoo"), KW("trevenque"), KW("kyndryl"),
    KW("cívica"), KW("civica"), KW("experian"), KW("salesforce"),
    KW("nazaríes"), KW("nazaries"), KW("jtsec"), KW("innovasur"),
    KW("atlax"), KW("iagt"), KW("smalldev"), KW("fidesol"),
    KW("camarero10"), KW("galdón"), KW("galdon"), KW("solinsur"),
    KW("firmafy"), KW("q2b studio"), KW("htec"), KW("ayesa"),
    KW("inetum"), KW("ntt data"), KW("minsait"), KW("sd worx"),
    KW("strada"), KW("t-systems"), KW("telefónica tech"), KW("unit4"),
    KW("zalaris"), KW("elca"), KW("koh young"), KW("safran"),
    KW("atisoluciones"), KW("atlax360"), KW("breca"), KW("debos"),
    KW("isbue"), KW("facturatech"),
    KW("empresa"), KW("startup"), KW("alianza"), KW("inversión"),
    KW("contratación"), KW("sede"), KW("oficina"),
  ],
  eventos: [
    KW("hackathon"), KW("hackatón"), KW("meetup"), KW("jornada"),
    KW("charla"), KW("evento"), KW("conferencia"), KW("taller"),
    KW("workshop"), KW("webinar"), KW("formación"), KW("curso"),
    KW("betabeers"), KW("gdg"), KW("barcamp"),
  ],
  stack: [
    KW("java"), KW("sql"), KW("react"), KW("next.js"), KW("nextjs"),
    KW("typescript"), KW("javascript"), KW("python"), KW("backend"),
    KW("frontend"), KW("fullstack"), KW("full stack"), KW("programación"),
    KW("desarrollo"), KW("software"), KW("developer"),
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

  // Bonus base por categoría
  if (category === "granada") score += 10;
  if (category === "ia") score += 10;
  if (category === "empresas_granada") score += 10;
  if (category === "eventos_granada") score += 15;

  // Contenido sobre Granada → siempre relevante
  if (includesAny(text, KEYWORDS.granada)) score += 30;

  // IA y tecnología avanzada
  if (includesAny(text, KEYWORDS.ia)) score += 20;

  // Hub IA Granada / CENIA → muy relevante
  if (includesAny(text, KEYWORDS.cenia)) score += 40;

  // Empresas tech en Granada
  if (includesAny(text, KEYWORDS.empresas) && includesAny(text, KEYWORDS.granada)) score += 25;
  else if (includesAny(text, KEYWORDS.empresas)) score += 10;

  // Eventos y formación
  if (includesAny(text, KEYWORDS.eventos)) score += 15;
  if (includesAny(text, KEYWORDS.eventos) && includesAny(text, KEYWORDS.granada)) score += 10;

  // Stack técnico relevante
  if (includesAny(text, KEYWORDS.stack)) score += 10;

  // Sin ningún match → muy poco relevante
  if (score <= 10) score = -20;

  return score;
}

export function extractTags(title: string, description?: string): string[] {
  const text = `${title} ${description ?? ""}`.toLowerCase();
  const candidates = [
    "granada", "ugr", "ia", "ai", "machine learning", "python",
    "javascript", "react", "typescript", "java", "sql",
    "startup", "hackathon", "meetup", "jornada", "charla",
    "sidn", "trevenque", "nucleoo", "kyndryl", "civica",
    "nazaries", "jtsec", "innovasur", "atlax", "iagt", "smalldev",
    "fidesol", "camarero10", "galdon", "solinsur", "firmafy",
    "htec", "ayesa", "inetum", "ntt data", "minsait", "sd worx",
    "cenia", "llm", "chatgpt", "openai", "gemini",
    "frontend", "backend", "fullstack", "desarrollo", "formación",
  ];
  const found = new Set<string>();
  for (const c of candidates) {
    if (text.includes(c)) found.add(c);
  }
  return Array.from(found).slice(0, 6);
}
