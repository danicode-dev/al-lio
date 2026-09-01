export const jobPlatforms = [
  "LinkedIn",
  "InfoJobs",
  "Indeed",
  "Tecnoempleo",
  "Glassdoor",
  "Infoempleo",
  "Computrabajo",
  "Adzuna",
  "Monster",
  "Jobtome",
  "Jooble",
  "Randstad",
  "Manpower",
  "Adecco",
  "Wellfound",
  "Remotive",
  "We Work Remotely",
  "JobToday",
  "Talent.com",
  "Welcome to the Jungle",
] as const;

export type JobPlatform = (typeof jobPlatforms)[number];

function isRemoteSearch(location: string) {
  const value = location.trim().toLowerCase();
  return value === "teletrabajo" || value === "remoto" || value === "remote";
}

export function buildJobSearchUrl(platform: string, keyword: string, location = "") {
  const remote = isRemoteSearch(location);
  const cleanKeyword = keyword.trim();
  const searchKeyword = remote ? `${cleanKeyword} teletrabajo`.trim() : cleanKeyword;
  const q = encodeURIComponent(searchKeyword);
  const baseQ = encodeURIComponent(cleanKeyword);
  const l = encodeURIComponent(remote ? "Espana" : location.trim());

  switch (platform.toLowerCase()) {
    case "linkedin":
      return remote
        ? `https://www.linkedin.com/jobs/search/?keywords=${baseQ}&location=${l}&f_WT=2`
        : `https://www.linkedin.com/jobs/search/?keywords=${q}&location=${l}`;
    case "infojobs":
      return remote
        ? `https://www.infojobs.net/jobsearch/search-results/list.xhtml?keyword=${q}&telecommuting=1`
        : `https://www.infojobs.net/jobsearch/search-results/list.xhtml?keyword=${q}&provinceIds=&page=1&sortBy=RELEVANCE`;
    case "indeed":
      return `https://es.indeed.com/jobs?q=${q}&l=${l}`;
    case "tecnoempleo":
      return remote
        ? `https://www.tecnoempleo.com/ofertas-trabajo/?te=${q}&pr=`
        : `https://www.tecnoempleo.com/ofertas-trabajo/?te=${q}&pr=${l}`;
    case "glassdoor":
      return `https://www.glassdoor.es/Empleo/empleos.htm?suggestCount=0&typedKeyword=${q}&sc.keyword=${q}`;
    case "infoempleo":
      return remote
        ? `https://www.infoempleo.com/buscadorOfertas/?q=${q}&modalidad=teletrabajo`
        : `https://www.infoempleo.com/buscadorOfertas/?q=${q}&localidad=${l}`;
    case "computrabajo":
      return remote
        ? `https://www.computrabajo.es/ofertas-de-trabajo/?q=${q}`
        : `https://www.computrabajo.es/ofertas-de-trabajo/?q=${q}&l=${l}`;
    case "adzuna":
      return `https://www.adzuna.es/search?q=${q}&w=${l}`;
    case "monster":
      return `https://www.monster.es/trabajo/buscar/?q=${q}&where=${l}`;
    case "jobtome":
      return `https://es.jobtome.com/q/${encodeURIComponent(cleanKeyword)}/l/${encodeURIComponent(remote ? "Teletrabajo" : location.trim())}`;
    case "jooble":
      return `https://es.jooble.org/SearchResult?ukw=${q}&rgns=${l}`;
    case "randstad":
      return remote
        ? `https://www.randstad.es/candidatos/buscador-empleo/?q=${q}`
        : `https://www.randstad.es/candidatos/buscador-empleo/?q=${q}&c=${l}`;
    case "manpower":
      return `https://www.manpower.es/empleo/busqueda?t=${q}`;
    case "adecco":
      return remote
        ? `https://www.adecco.es/candidatos/buscar-empleo?q=${q}`
        : `https://www.adecco.es/candidatos/buscar-empleo?q=${q}&l=${l}`;
    case "wellfound":
      return `https://wellfound.com/jobs?q=${q}`;
    case "remotive":
      return `https://remotive.com/remote-jobs/search?search=${q}`;
    case "we work remotely":
      return `https://weworkremotely.com/remote-jobs/search?term=${q}`;
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
