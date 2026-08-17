const GRANADA_TERMS = ["granada", "armilla", "albolote", "maracena", "ogijares", "huetor", "pts"];
const REMOTE_ONLY_TERMS = ["remote", "remoto", "teletrabajo", "worldwide", "anywhere", "us only", "eu only"];
const ENTRY_TERMS = [
  "junior",
  "practicas",
  "prácticas",
  "becario",
  "becaria",
  "trainee",
  "internship",
  "fp",
  "daw",
  "dam",
];
const STACK_TERMS = [
  "programador",
  "desarrollador",
  "developer",
  "software",
  "frontend",
  "backend",
  "full stack",
  "fullstack",
  "java",
  "javascript",
  "typescript",
  "react",
  "next",
  "sql",
  "mysql",
  "postgres",
  "python",
  "qa",
  "soporte it",
  "data analyst",
  "analista de datos",
];
const SENIOR_TERMS = ["senior", "lead ", "principal", "staff ", "arquitecto", "5+ years", "5 años", "6 años"];

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

function hasAny(text: string, terms: string[]): boolean {
  return terms.some((term) => text.includes(normalize(term)));
}

export function isGranadaCandidateJobText(text: string): boolean {
  const normalized = normalize(text);
  const inGranada = hasAny(normalized, GRANADA_TERMS);
  if (!inGranada) return false;

  const remoteOnly = hasAny(normalized, REMOTE_ONLY_TERMS) && !normalized.includes("granada");
  if (remoteOnly) return false;

  const entryFit = hasAny(normalized, ENTRY_TERMS);
  const stackFit = hasAny(normalized, STACK_TERMS);
  const seniorOnly = hasAny(normalized, SENIOR_TERMS) && !entryFit;

  return (entryFit || stackFit) && !seniorOnly;
}
