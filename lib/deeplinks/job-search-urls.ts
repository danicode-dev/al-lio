export const jobPlatforms = [
  "LinkedIn",
  "InfoJobs",
  "Indeed",
  "Tecnoempleo",
  "Adzuna",
  "Jooble",
  "Remotive",
  "JobToday",
  "Talent.com",
  "Welcome to the Jungle",
] as const;

export type JobPlatform = (typeof jobPlatforms)[number];

export function buildJobSearchUrl(platform: string, keyword: string, location = "") {
  const q = encodeURIComponent(keyword.trim());
  const l = encodeURIComponent(location.trim());

  switch (platform.toLowerCase()) {
    case "linkedin":
      return `https://www.linkedin.com/jobs/search/?keywords=${q}&location=${l}`;
    case "infojobs":
      return `https://www.infojobs.net/jobsearch/search-results/list.xhtml?keyword=${q}&provinceIds=&segmentId=&page=1&sortBy=RELEVANCE`;
    case "indeed":
      return `https://es.indeed.com/jobs?q=${q}&l=${l}`;
    case "tecnoempleo":
      return `https://www.tecnoempleo.com/ofertas-trabajo/?te=${q}&pr=${l}`;
    case "adzuna":
      return `https://www.adzuna.es/search?q=${q}&w=${l}`;
    case "jooble":
      return `https://es.jooble.org/SearchResult?ukw=${q}&rgns=${l}`;
    case "remotive":
      return `https://remotive.com/remote-jobs/search?search=${q}`;
    case "jobtoday":
      return `https://jobtoday.com/es/trabajos?q=${q}&l=${l}`;
    case "talent.com":
      return `https://es.talent.com/jobs?k=${q}&l=${l}`;
    case "welcome to the jungle":
      return `https://www.welcometothejungle.com/es/jobs?query=${q}&aroundQuery=${l}`;
    default:
      return `https://www.google.com/search?q=${q}+${l}`;
  }
}

export const initialQuickSearches = [
  ["Desarrollador Web Junior", "Granada"],
  ["Java Junior", "Granada"],
  ["Backend Junior", "Granada"],
  ["React Junior", "Malaga"],
  ["Practicas DAW", "Granada"],
  ["Desarrollador Full Stack Junior", "Remoto"],
  ["Spring Boot Junior", "Remoto"],
  ["Programador Junior", "Andalucia"],
  ["Frontend Junior", "Remoto"],
  ["SQL Junior", "Granada"],
];
