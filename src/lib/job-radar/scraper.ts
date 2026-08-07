import crypto from "crypto";
import type { RadarCompany } from "./types";

// High-confidence: 1 match is enough to trigger
const HIGH_CONF_KEYWORDS = [
  "vacante", "vacantes", "oferta de empleo", "oferta de trabajo",
  "buscamos", "seleccionamos", "incorporación", "incorporacion",
  "te estamos buscando", "únete al equipo", "unete al equipo",
  "forma parte del equipo", "job opening", "open position", "we are hiring",
  "current openings", "current vacancies", "see all jobs", "apply now",
  "ver todas las ofertas", "ver ofertas", "enviar candidatura",
];

// Low-confidence: need ≥2 matches
const LOW_CONF_KEYWORDS = [
  "junior", "senior", "practicas", "prácticas", "becario", "becaria",
  "fullstack", "full stack", "backend", "frontend", "developer", "desarrollador",
  "programador", "analista", "técnico", "tecnico", "ingeniero", "diseñador",
  "perfil", "candidato", "candidatura", "solicitar", "apply",
  "join us", "join our team", "empleo", "trabajo", "puesto",
  "contrato", "jornada", "remoto", "teletrabajo", "presencial",
  "incorporarse", "oportunidad laboral", "oportunidades laborales",
];

export interface ScrapedJob {
  company_name: string;
  company_url: string;
  job_title: string;
  job_url: string | null;
  page_hash: string;
}

async function safeFetch(url: string): Promise<string | null> {
  try {
    const ctrl = new AbortController();
    const timeout = setTimeout(() => ctrl.abort(), 12_000);
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "es-ES,es;q=0.9,en;q=0.8",
        "Accept-Encoding": "gzip, deflate, br",
        "Cache-Control": "no-cache",
      },
    });
    clearTimeout(timeout);
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

function extractText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    // Preserve text in title, h1-h4, li, a, p, span, button, label, td
    .replace(/<\/(li|p|h[1-6]|td|tr|div|section|article)>/gi, " | ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#[0-9]+;/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 12000);
}

function hasJobContent(text: string): boolean {
  const lower = text.toLowerCase();
  // One high-confidence keyword is sufficient
  for (const kw of HIGH_CONF_KEYWORDS) {
    if (lower.includes(kw)) return true;
  }
  // Or two low-confidence keywords
  let lowCount = 0;
  for (const kw of LOW_CONF_KEYWORDS) {
    if (lower.includes(kw)) {
      lowCount++;
      if (lowCount >= 2) return true;
    }
  }
  return false;
}

function md5(text: string): string {
  return crypto.createHash("md5").update(text).digest("hex");
}

function extractTitles(text: string, companyName: string): string[] {
  const titles: string[] = [];
  const patterns = [
    /buscamos\s+(?:un(?:a)?\s+)?([^|.,\n]{5,70})/gi,
    /vacante(?:\s+para)?\s*[:\-]?\s*([^|.,\n]{5,70})/gi,
    /puesto\s+de\s*[:\-]?\s*([^|.,\n]{5,70})/gi,
    /oferta\s*[:\-]\s*([^|.,\n]{5,70})/gi,
    /(?:desarrollador|developer|programador|analista|técnico|tecnico|ingeniero|diseñador|gestor|consultor|data\s+\w+|cloud\s+\w+)[^|.,\n]{0,60}/gi,
  ];
  for (const pattern of patterns) {
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(text)) !== null && titles.length < 5) {
      const candidate = (match[1] ?? match[0])?.trim().replace(/\s+/g, " ");
      if (candidate && candidate.length > 5 && candidate.length < 90) {
        // Avoid duplicates (case-insensitive)
        const lower = candidate.toLowerCase();
        if (!titles.some((t) => t.toLowerCase() === lower)) {
          titles.push(candidate);
        }
      }
    }
  }
  return titles.length > 0 ? titles : [`Ofertas en ${companyName}`];
}

export async function scrapeCompany(company: RadarCompany): Promise<ScrapedJob[]> {
  const html = await safeFetch(company.careers_url);
  if (!html) return [];

  const text = extractText(html);
  if (!hasJobContent(text)) return [];

  // Use a larger window for the hash so it captures more of the page state
  const hash = md5(text.slice(0, 6000));
  const titles = extractTitles(text, company.name);

  return titles.slice(0, 4).map((title) => ({
    company_name: company.name,
    company_url:  company.careers_url,
    job_title:    title,
    job_url:      null,
    page_hash:    hash,
  }));
}
