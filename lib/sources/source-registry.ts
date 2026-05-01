/**
 * Source registry for the Noticias module.
 *
 * Centraliza todas las fuentes externas (RSS, APIs públicas, enlaces directos
 * y HTML) que pueden alimentar el radar diario de noticias.
 *
 * Reglas:
 *  - Priorizar RSS y APIs públicas
 *  - HTML solo cuando no hay RSS
 *  - Enlaces directos (web-link) si la fuente requiere login o tiene restricciones
 *  - No copiar artículos completos: solo título, descripción corta, URL, fuente, fecha
 */

export type NewsCategory =
  | "tech"
  | "granada"
  | "economy"
  | "programming"
  | "jobs"
  | "companies"
  | "hackathons";

export type SourceMethod =
  | "rss"
  | "rss-list"
  | "api"
  | "html"
  | "html-or-feed-check"
  | "html-link-only"
  | "rss-or-html"
  | "web-link";

export type SourcePriority = "high" | "medium" | "low";

export type Source = {
  id: string;
  name: string;
  category: NewsCategory;
  method: SourceMethod;
  url: string;
  priority: SourcePriority;
  notes?: string;
  tags?: string[];
  queries?: string[];
  /** RSS reales conocidos para esta fuente. */
  feeds?: string[];
};

export const SOURCES: Source[] = [
  // ─── Programación / IA / Tech ─────────────────────────────────────────────
  {
    id: "devto-api",
    name: "DEV.to",
    category: "programming",
    method: "api",
    url: "https://dev.to/api/articles",
    priority: "high",
    tags: ["javascript", "java", "sql", "react", "nextjs", "webdev", "ai", "python"],
  },
  {
    id: "hackernews-top",
    name: "Hacker News",
    category: "programming",
    method: "api",
    url: "https://hacker-news.firebaseio.com/v0/topstories.json",
    priority: "medium",
  },
  {
    id: "hackernews-jobs",
    name: "Hacker News Jobs",
    category: "programming",
    method: "web-link",
    url: "https://hacker-news.firebaseio.com/v0/jobstories.json",
    priority: "medium",
    notes: "No se sincroniza como empleo: no filtra por Granada.",
  },
  {
    id: "genbeta",
    name: "Genbeta",
    category: "tech",
    method: "rss",
    url: "https://www.genbeta.com/",
    priority: "medium",
    feeds: ["https://www.genbeta.com/index.xml"],
  },
  {
    id: "microsiervos",
    name: "Microsiervos",
    category: "tech",
    method: "rss",
    url: "https://www.microsiervos.com/",
    priority: "medium",
    feeds: ["https://www.microsiervos.com/index.xml"],
  },
  {
    id: "nextjs-blog",
    name: "Next.js Blog",
    category: "programming",
    method: "rss",
    url: "https://nextjs.org/blog",
    priority: "high",
    feeds: ["https://nextjs.org/feed.xml"],
  },
  {
    id: "vercel-blog",
    name: "Vercel Blog",
    category: "programming",
    method: "rss",
    url: "https://vercel.com/blog",
    priority: "medium",
    feeds: ["https://vercel.com/atom"],
  },
  {
    id: "stackoverflow-blog",
    name: "Stack Overflow Blog",
    category: "programming",
    method: "rss",
    url: "https://stackoverflow.blog/",
    priority: "medium",
    feeds: ["https://stackoverflow.blog/feed/"],
  },

  // ─── Granada ──────────────────────────────────────────────────────────────
  {
    id: "granada-hoy-granada",
    name: "Granada Hoy",
    category: "granada",
    method: "rss",
    url: "https://www.granadahoy.com/granada/",
    priority: "high",
    feeds: ["https://www.granadahoy.com/granada.rss"],
  },
  {
    id: "granada-hoy-tecnologia",
    name: "Granada Hoy · Tecnología",
    category: "tech",
    method: "rss",
    url: "https://www.granadahoy.com/tecnologia/",
    priority: "medium",
    feeds: ["https://www.granadahoy.com/tecnologia.rss"],
  },
  {
    id: "ugr-rss",
    name: "UGR Noticias",
    category: "granada",
    method: "rss",
    url: "https://www.ugr.es/",
    priority: "high",
    feeds: ["https://www.ugr.es/rss.xml"],
  },
  {
    id: "ahora-granada",
    name: "Ahora Granada",
    category: "granada",
    method: "web-link",
    url: "https://www.ahoragranada.com/",
    priority: "medium",
  },
  {
    id: "europa-press-granada",
    name: "Europa Press Granada",
    category: "granada",
    method: "web-link",
    url: "https://www.europapress.es/andalucia/granada-00353/",
    priority: "medium",
    notes: "Mostrar titulares y enlace. No redistribuir contenido completo.",
  },

  // ─── Economía ─────────────────────────────────────────────────────────────
  {
    id: "cinco-dias-rss",
    name: "Cinco Días",
    category: "economy",
    method: "rss",
    url: "https://cincodias.elpais.com/",
    priority: "high",
    feeds: ["https://feeds.elpais.com/mrss-s/pages/ep/site/cincodias.elpais.com/portada"],
  },
  {
    id: "eleconomista-rss",
    name: "El Economista",
    category: "economy",
    method: "rss",
    url: "https://www.eleconomista.es/",
    priority: "medium",
    feeds: ["https://www.eleconomista.es/rss/rss-portada.php"],
  },
  {
    id: "granada-hoy-economia",
    name: "Granada Hoy · Economía",
    category: "economy",
    method: "rss",
    url: "https://www.granadahoy.com/economia/",
    priority: "medium",
    feeds: ["https://www.granadahoy.com/economia.rss"],
  },

  // ─── Empleo tech ──────────────────────────────────────────────────────────
  {
    id: "tecnoempleo-granada-programador",
    name: "Tecnoempleo Granada · Programador",
    category: "jobs",
    method: "rss-or-html",
    url: "https://www.tecnoempleo.com/ofertas-trabajo/granada/programador",
    priority: "high",
    feeds: ["https://www.tecnoempleo.com/rss/feed.php?pr=GRANADA&te=programador"],
  },
  {
    id: "tecnoempleo-granada-api",
    name: "Tecnoempleo Granada · API",
    category: "jobs",
    method: "rss-or-html",
    url: "https://www.tecnoempleo.com/ofertas-trabajo/granada/api",
    priority: "high",
    feeds: ["https://www.tecnoempleo.com/rss/feed.php?pr=GRANADA&te=api"],
  },
  {
    id: "tecnoempleo-granada-analista",
    name: "Tecnoempleo Granada · Analista Programador",
    category: "jobs",
    method: "rss-or-html",
    url: "https://www.tecnoempleo.com/ofertas-trabajo/granada/analista-programador",
    priority: "high",
    feeds: ["https://www.tecnoempleo.com/rss/feed.php?pr=GRANADA&te=analista-programador"],
  },
  {
    id: "remotive-api",
    name: "Remotive",
    category: "jobs",
    method: "web-link",
    url: "https://remotive.com/api/remote-jobs",
    priority: "medium",
    notes: "Desactivado para ofertas a revisar: remoto global, no Granada.",
  },
  {
    id: "infojobs-granada-programador",
    name: "InfoJobs Granada · Programador",
    category: "jobs",
    method: "web-link",
    url: "https://www.infojobs.net/ofertas-trabajo/granada/programador",
    priority: "high",
  },
  {
    id: "linkedin-data-granada",
    name: "LinkedIn · Datos Granada",
    category: "jobs",
    method: "web-link",
    url: "https://es.linkedin.com/jobs/analisis-de-datos-empleos-granada",
    priority: "high",
  },
  {
    id: "linkedin-informatica-granada",
    name: "LinkedIn · Informática Granada",
    category: "jobs",
    method: "web-link",
    url: "https://es.linkedin.com/jobs/informatica-empleos-granada",
    priority: "high",
  },
  {
    id: "sae-ofertas",
    name: "SAE · Ofertas Públicas",
    category: "jobs",
    method: "web-link",
    url: "https://saempleo.es/ags/candidaturas/lista-ofertas-publicas/lista",
    priority: "high",
  },
  {
    id: "sepe-empleate",
    name: "SEPE Empléate",
    category: "jobs",
    method: "web-link",
    url: "https://www.sepe.es/HomeSepe/encontrar-trabajo/ofertas-empleo.html",
    priority: "medium",
  },
  {
    id: "eures",
    name: "EURES",
    category: "jobs",
    method: "web-link",
    url: "https://eures.europa.eu/jobseekers_es",
    priority: "medium",
  },

  // ─── Empresas Granada ─────────────────────────────────────────────────────
  {
    id: "civica-careers",
    name: "Cívica · Empleo",
    category: "companies",
    method: "web-link",
    url: "https://empleo.civica-soft.com/jobs",
    priority: "high",
  },
  {
    id: "sidn-careers",
    name: "SIDN · Careers",
    category: "companies",
    method: "web-link",
    url: "https://www.sidn.es/career",
    priority: "high",
  },
  {
    id: "sidn-factorial",
    name: "SIDN · Factorial",
    category: "companies",
    method: "web-link",
    url: "https://sidn.factorialhr.com/",
    priority: "high",
  },
  {
    id: "nucleoo-careers",
    name: "Nucleoo · Careers",
    category: "companies",
    method: "web-link",
    url: "https://www.nucleoo.com/careers/",
    priority: "high",
  },
  {
    id: "kyndryl-granada",
    name: "Kyndryl · Granada",
    category: "companies",
    method: "web-link",
    url: "https://kyndryl.dejobs.org/locations/granada-esp/jobs/",
    priority: "high",
  },
  {
    id: "trevenque",
    name: "Trevenque Group",
    category: "companies",
    method: "web-link",
    url: "https://www.trevenque.es/",
    priority: "medium",
  },

  // ─── Hackathons / formación ───────────────────────────────────────────────
  {
    id: "andalucia-emprende-granada",
    name: "Andalucía Emprende · Granada",
    category: "hackathons",
    method: "web-link",
    url: "https://www.andaluciaemprende.es/provincia/granada/",
    priority: "medium",
  },
  {
    id: "ideas-factory-ugr",
    name: "Ideas Factory UGR",
    category: "hackathons",
    method: "web-link",
    url: "https://ideasfactory.es/ugr/",
    priority: "high",
  },
];

export const CATEGORY_LABELS: Record<NewsCategory, string> = {
  tech: "Tech",
  granada: "Granada",
  economy: "Economía",
  programming: "Programación / IA",
  jobs: "Empleo",
  companies: "Empresas",
  hackathons: "Hackathons / Formación",
};

export function getSource(id: string): Source | undefined {
  return SOURCES.find((s) => s.id === id);
}

export function getFetchableSources(): Source[] {
  return SOURCES.filter((s) => s.method !== "web-link" && s.method !== "html-link-only");
}

export function getWebLinkSources(): Source[] {
  return SOURCES.filter((s) => s.method === "web-link" || s.method === "html-link-only");
}
