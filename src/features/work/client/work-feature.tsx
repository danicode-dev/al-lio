"use client";

import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Building2, ChevronDown, ExternalLink, Heart, Plus, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { buildJobSearchUrl, jobPlatforms, type JobPlatform } from "@/lib/deeplinks/job-search-urls";
import { SPANISH_PROVINCES } from "@/lib/deeplinks/spanish-provinces";
import { getQuickSearchesAction, saveQuickSearchAction, type SavedQuickSearch } from "@/lib/work/actions";
import { toast } from "sonner";
import type { JobApplication, ApplicationStatus } from "@/lib/job-radar/types";
import { APPLICATION_STATUSES, STATUS_LABELS, STATUS_COLORS } from "@/lib/job-radar/types";
import type { VerifiedJob, VerifiedJobPrivateAction } from "@/lib/jobs/types";
import { VerifiedJobsView } from "@/components/jobs/verified-jobs-view";
import { useStore } from "@/shared/store/store-provider";
import type { Company, ReturnTypeActions, Store } from "@/components/store/types";
import { FeaturePage } from "@/shared/ui/feature-page";

const workBrandCss = `
  .al-work-tabs { display: inline-flex; align-items: center; gap: 2px; background: #f5f2ea; border-radius: 10px; padding: 3px; }
  .al-work-tab { border: none; background: transparent; border-radius: 8px; padding: 7px 14px; font-size: 13px; font-weight: 700; color: #6b6f72; cursor: pointer; transition: background .15s, color .15s; }
  .al-work-tab-active { background: var(--al-action-soft-bg-hover); color: var(--al-action-soft-text-hover); box-shadow: inset 0 0 0 1px var(--al-action-soft-border), 0 4px 12px rgba(80, 43, 27, 0.05); }

  .al-work-section-title { font-size: 13px; font-weight: 700; color: #333029; margin-bottom: 2px; }

  .al-work-portal-grid { display: grid; gap: 10px; align-items: start; }
  .al-work-portal-card { border: 1px solid #ece7dc; border-radius: 14px; background: white; padding: 10px; box-shadow: 0 8px 20px rgba(17, 17, 17, 0.04); transition: border-color .15s, box-shadow .15s; }
  .al-work-portal-card-expanded { border-color: rgba(225, 93, 45, 0.35); box-shadow: 0 10px 24px rgba(225, 93, 45, 0.1); }
  .al-work-portal-head { display: flex; width: 100%; align-items: center; gap: 10px; text-align: left; border: none; background: transparent; cursor: pointer; padding: 0; }
  .al-work-portal-mark { display: flex; height: 32px; width: 32px; flex-shrink: 0; align-items: center; justify-content: center; overflow: hidden; border-radius: 10px; border: 1px solid #ece7dc; background: white; }
  .al-work-portal-title { font-size: 13.5px; font-weight: 700; color: #111111; }
  .al-work-portal-sub { font-size: 11px; color: #9a958a; }
  .al-work-portal-expand { margin-top: 10px; display: grid; gap: 8px; }
  .al-work-portal-field { display: grid; gap: 3px; }
  .al-work-portal-field-label { font-size: 10px; font-weight: 700; color: #9a958a; text-transform: uppercase; letter-spacing: .03em; }
  .al-work-portal-search-btn { display: flex; align-items: center; justify-content: center; gap: 6px; width: 100%; height: 34px; padding: 0 14px; border-radius: 10px; border: 1px solid var(--al-action-soft-border); background: var(--al-action-soft-bg); color: var(--al-action-soft-text); font-size: 12.5px; font-weight: 700; cursor: pointer; white-space: nowrap; text-decoration: none; transition: background .15s, border-color .15s, color .15s; }
  .al-work-portal-search-btn:hover { border-color: var(--al-action-soft-border-hover); background: var(--al-action-soft-bg-hover); color: var(--al-action-soft-text-hover); }
  .al-work-portal-search-btn-disabled { opacity: .5; cursor: not-allowed; pointer-events: none; }

  .al-work-province { position: relative; }
  .al-work-province-trigger { width: 100%; height: 32px; display: flex; align-items: center; justify-content: space-between; gap: 6px; border-radius: 8px; border: 1px solid #e4dfd5; background: white; padding: 0 10px; cursor: pointer; font-size: 12px; color: #111111; transition: border-color .15s, box-shadow .15s; }
  .al-work-province-trigger:hover:not(:disabled) { border-color: #d8d1c2; }
  .al-work-province-trigger[aria-expanded="true"] { border-color: rgba(225, 93, 45, 0.5); box-shadow: 0 0 0 3px rgba(225, 93, 45, 0.12); }
  .al-work-province-trigger:disabled { cursor: not-allowed; background: #f5f2ea; color: #9a958a; }
  .al-work-province-value { flex: 1; min-width: 0; text-align: left; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .al-work-province-placeholder { color: #a39d8e; }
  .al-work-province-chevron { width: 14px; height: 14px; color: #9a9589; flex-shrink: 0; transition: transform .15s; }
  .al-work-province-trigger[aria-expanded="true"] .al-work-province-chevron { transform: rotate(180deg); }
  .al-work-province-panel { position: absolute; z-index: 20; top: calc(100% + 6px); left: 0; right: 0; background: white; border: 1px solid #ece7dc; border-radius: 12px; box-shadow: 0 16px 40px rgba(17, 17, 17, 0.12); padding: 6px; }
  .al-work-province-filter { width: 100%; height: 30px; border-radius: 7px; border: 1px solid #ece7dc; padding: 0 8px; font-size: 12px; margin-bottom: 4px; }
  .al-work-province-list { list-style: none; margin: 0; padding: 0; max-height: 180px; overflow-y: auto; }
  .al-work-province-option { width: 100%; display: block; text-align: left; padding: 6px 8px; border-radius: 7px; border: none; background: transparent; font-size: 12px; color: #111111; cursor: pointer; }
  .al-work-province-option:hover { background: #f7f4ee; }
  .al-work-province-option-selected { background: #fbe7dd; color: #e15d2d; font-weight: 600; }
  .al-work-province-empty { padding: 8px; font-size: 12px; color: #9a958a; text-align: center; }

  .al-work-remote-row { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
  .al-work-remote-switch { position: relative; display: inline-flex; height: 20px; width: 36px; flex-shrink: 0; align-items: center; border-radius: 999px; border: 1px solid transparent; cursor: pointer; background: #e4dfd5; transition: background-color .15s, border-color .15s; }
  .al-work-remote-switch[aria-checked="true"] { border-color: var(--al-action-soft-border-hover); background: var(--al-action-soft-bg-hover); }
  .al-work-remote-switch-thumb { display: inline-block; height: 14px; width: 14px; border-radius: 999px; background: white; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2); transform: translateX(3px); transition: transform .15s; }
  .al-work-remote-switch[aria-checked="true"] .al-work-remote-switch-thumb { background: var(--al-action-soft-text); transform: translateX(17px); }

  .al-work-portal-link-grid { display: grid; gap: 8px; }
  .al-work-portal-link-card { display: flex; align-items: center; gap: 8px; border: 1px solid #ece7dc; border-radius: 12px; background: white; padding: 8px 10px; text-decoration: none; transition: border-color .15s, box-shadow .15s; }
  .al-work-portal-link-card:hover { border-color: rgba(225, 93, 45, 0.35); box-shadow: 0 8px 18px rgba(17, 17, 17, 0.05); }
  .al-work-portal-link-title { flex: 1; min-width: 0; font-size: 12.5px; font-weight: 600; color: #333029; }
  .al-work-portal-link-icon { color: #9a958a; flex-shrink: 0; }

  .al-work-companies-toolbar { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; }
  .al-work-company-views { display: inline-flex; align-items: center; gap: 2px; border: 1px solid #ece7dc; border-radius: 11px; background: white; padding: 3px; }
  .al-work-company-view { display: inline-flex; align-items: center; gap: 5px; height: 32px; padding: 0 10px; border: none; border-radius: 8px; background: transparent; color: #6b6f72; font-size: 12px; font-weight: 600; cursor: pointer; }
  .al-work-company-view-active { box-shadow: inset 0 0 0 1px var(--al-action-soft-border); background: var(--al-action-soft-bg-hover); color: var(--al-action-soft-text-hover); }
  .al-work-company-grid { display: grid; gap: 12px; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); }
  .al-work-company-card { position: relative; border: 1px solid #ece7dc; border-radius: 16px; background: white; padding: 16px; box-shadow: 0 10px 26px rgba(17, 17, 17, 0.045); display: flex; flex-direction: column; gap: 8px; min-height: 178px; }
  .al-work-company-top { display: flex; align-items: flex-start; justify-content: space-between; gap: 8px; }
  .al-work-company-name { font-size: 14.5px; font-weight: 700; color: #111111; line-height: 1.3; }
  .al-work-company-category { font-size: 11.5px; color: #6b6f72; line-height: 1.4; margin-top: 2px; display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; overflow: hidden; }
  .al-work-company-note { font-size: 11px; color: #9a958a; line-height: 1.45; display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; overflow: hidden; }
  .al-work-company-hint { font-size: 11px; color: #9a958a; line-height: 1.4; }
  .al-work-company-fav { display: flex; align-items: center; justify-content: center; width: 30px; height: 30px; border-radius: 999px; border: 1px solid #ece7dc; background: white; color: #c9c3b6; cursor: pointer; flex-shrink: 0; transition: color .15s, border-color .15s, background .15s; }
  .al-work-company-fav-active { color: var(--al-action-soft-text); border-color: var(--al-action-soft-border-hover); background: var(--al-action-soft-bg-hover); }
  .al-work-company-actions { display: flex; gap: 8px; margin-top: auto; padding-top: 6px; }
  .al-work-company-btn { flex: 1; display: inline-flex; align-items: center; justify-content: center; gap: 5px; height: 34px; border-radius: 10px; font-size: 12px; font-weight: 700; text-decoration: none; cursor: pointer; }
  .al-work-company-btn-solid { border: 1px solid var(--al-action-soft-border); color: var(--al-action-soft-text); background: var(--al-action-soft-bg); transition: background .15s, border-color .15s, color .15s; }
  .al-work-company-btn-solid:hover { border-color: var(--al-action-soft-border-hover); color: var(--al-action-soft-text-hover); background: var(--al-action-soft-bg-hover); }

  .al-work-tab:focus-visible, .al-work-portal-search-btn:focus-visible, .al-work-remote-switch:focus-visible, .al-work-company-view:focus-visible, .al-work-company-fav:focus-visible, .al-work-company-btn:focus-visible { outline: 3px solid var(--al-action-soft-focus); outline-offset: 2px; }

  .al-work-empty { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 40px 16px; text-align: center; border: 1px dashed #e4dfd5; border-radius: 16px; background: white; }
  .al-work-empty-title { font-size: 14px; font-weight: 700; color: #333029; }
  .al-work-empty-desc { font-size: 12px; color: #9a958a; max-width: 360px; }
`;

const WORK_DIACRITICS_PATTERN = new RegExp(`[${String.fromCharCode(0x0300)}-${String.fromCharCode(0x036f)}]`, "g");

function normalizeForProvinceSearch(value: string) {
  return value.trim().toLowerCase().normalize("NFD").replace(WORK_DIACRITICS_PATTERN, "");
}

function ProvinceCombobox({
  value,
  onChange,
  disabled,
  placeholder,
  ariaLabel,
}: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder: string;
  ariaLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const filterRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setFilter("");
    const raf = requestAnimationFrame(() => filterRef.current?.focus());
    return () => cancelAnimationFrame(raf);
  }, [open]);

  const results = useMemo(() => {
    const needle = normalizeForProvinceSearch(filter);
    if (!needle) return SPANISH_PROVINCES;
    return SPANISH_PROVINCES.filter((province) => normalizeForProvinceSearch(province).includes(needle));
  }, [filter]);

  return (
    <div className="al-work-province" ref={containerRef}>
      <button
        type="button"
        className="al-work-province-trigger"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        onClick={() => setOpen((current) => !current)}
      >
        <span className={cn("al-work-province-value", (disabled || !value) && "al-work-province-placeholder")}>
          {disabled ? placeholder : value || placeholder}
        </span>
        <ChevronDown className="al-work-province-chevron" aria-hidden="true" />
      </button>
      {open && !disabled && (
        <div className="al-work-province-panel">
          <input
            ref={filterRef}
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
            placeholder="Buscar provincia..."
            className="al-work-province-filter"
            aria-label="Filtrar provincias"
          />
          <ul className="al-work-province-list" role="listbox" aria-label={ariaLabel}>
            {results.length === 0 && <li className="al-work-province-empty">Sin resultados</li>}
            {results.map((province) => {
              const isSelected = province === value;
              return (
                <li key={province}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    className={cn("al-work-province-option", isSelected && "al-work-province-option-selected")}
                    onClick={() => {
                      onChange(province);
                      setOpen(false);
                    }}
                  >
                    {province}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

const QuickJobSearchCard = memo(function QuickJobSearchCard({
  platform,
  expanded,
  onToggle,
  saved,
  onSearch,
}: {
  platform: JobPlatform;
  expanded: boolean;
  onToggle: (p: JobPlatform) => void;
  saved?: SavedQuickSearch;
  onSearch: (platform: JobPlatform, keyword: string, location: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [province, setProvince] = useState("");
  const [remote, setRemote] = useState(false);
  const hydrated = useRef(false);

  useEffect(() => {
    if (hydrated.current || !saved) return;
    hydrated.current = true;
    setQuery(saved.keyword);
    const location = saved.location ?? "";
    if (normalizeForProvinceSearch(location) === "teletrabajo") {
      setRemote(true);
    } else if (location) {
      setProvince(location);
    }
  }, [saved]);

  const effectiveLocation = remote ? "Teletrabajo" : province;
  const url = useMemo(() => buildJobSearchUrl(platform, query, effectiveLocation), [platform, query, effectiveLocation]);
  const canSearch = query.trim().length > 0;

  return (
    <div className={cn("al-work-portal-card", expanded && "al-work-portal-card-expanded")}>
      <button type="button" className="al-work-portal-head" onClick={() => onToggle(platform)}>
        <PortalMark platform={platform} />
        <div className="min-w-0">
          <p className="al-work-portal-title truncate">{platform}</p>
          <p className="al-work-portal-sub truncate">Busqueda rapida</p>
        </div>
      </button>
      {expanded && (
        <div className="al-work-portal-expand">
          <div className="al-work-portal-field">
            <span className="al-work-portal-field-label">Qué buscas</span>
            <Input value={query} onChange={(event) => setQuery(event.target.value)} className="h-8 text-xs" placeholder="Puesto o palabra clave" aria-label={`Busqueda en ${platform}`} />
          </div>
          <div className="al-work-portal-field">
            <span className="al-work-portal-field-label">Provincia</span>
            <ProvinceCombobox
              value={province}
              onChange={setProvince}
              disabled={remote}
              placeholder={remote ? "Teletrabajo" : "Elige provincia"}
              ariaLabel={`Provincia de busqueda en ${platform}`}
            />
          </div>
          <label className="al-work-remote-row">
            <span className="al-work-portal-field-label">Teletrabajo</span>
            <button
              type="button"
              role="switch"
              aria-checked={remote}
              onClick={() => setRemote((current) => !current)}
              className="al-work-remote-switch"
            >
              <span className="al-work-remote-switch-thumb" />
            </button>
          </label>
          <a
            href={canSearch ? url : undefined}
            target="_blank"
            rel="noreferrer"
            aria-disabled={!canSearch}
            className={cn("al-work-portal-search-btn", !canSearch && "al-work-portal-search-btn-disabled")}
            onClick={(event) => {
              if (!canSearch) { event.preventDefault(); return; }
              onSearch(platform, query, effectiveLocation);
            }}
          >
            Buscar <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      )}
    </div>
  );
});

const PORTAL_DOMAINS: Record<JobPlatform, string> = {
  LinkedIn: "linkedin.com",
  InfoJobs: "infojobs.net",
  Indeed: "indeed.com",
  Tecnoempleo: "tecnoempleo.com",
  Glassdoor: "glassdoor.com",
  Infoempleo: "infoempleo.com",
  Computrabajo: "computrabajo.es",
  Adzuna: "adzuna.es",
  Monster: "monster.com",
  Jobtome: "jobtome.com",
  Jooble: "jooble.org",
  Randstad: "randstad.es",
  Manpower: "manpower.es",
  Adecco: "adecco.es",
  Wellfound: "wellfound.com",
  Remotive: "remotive.com",
  "We Work Remotely": "weworkremotely.com",
  JobToday: "jobtoday.com",
  "Talent.com": "talent.com",
  "Welcome to the Jungle": "welcometothejungle.com",
};

const PORTAL_COLORS: Partial<Record<JobPlatform, string>> = {
  LinkedIn: "bg-[#0A66C2] text-white",
  InfoJobs: "bg-[#167DB7] text-white",
  Tecnoempleo: "bg-[#F97316] text-white",
  Indeed: "bg-[#2557A7] text-white",
  Glassdoor: "bg-[#0CAA41] text-white",
  Infoempleo: "bg-[#CC1515] text-white",
  Computrabajo: "bg-[#FF5A00] text-white",
  Adzuna: "bg-[#E74C3C] text-white",
  Monster: "bg-[#6D29D9] text-white",
  Jobtome: "bg-[#2F80ED] text-white",
  Jooble: "bg-[#1AAB9B] text-white",
  Randstad: "bg-[#2B6CB0] text-white",
  Manpower: "bg-[#E31837] text-white",
  Adecco: "bg-[#E4002B] text-white",
  Wellfound: "bg-[#1A1A1A] text-white",
  Remotive: "bg-[#10B981] text-white",
  "We Work Remotely": "bg-[#1B9F4B] text-white",
  JobToday: "bg-[#3B82F6] text-white",
  "Talent.com": "bg-[#8B5CF6] text-white",
  "Welcome to the Jungle": "border border-[#e9d6cb] bg-[#fff8f4] text-[#a63f1a]",
};

function PortalMark({ platform }: { platform: JobPlatform }) {
  const [failed, setFailed] = useState(false);
  const domain = PORTAL_DOMAINS[platform];
  const src = `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;

  if (!failed) {
    return (
      <span className="al-work-portal-mark">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={platform}
          width={28}
          height={28}
          className="h-7 w-7 object-contain"
          onError={() => setFailed(true)}
        />
      </span>
    );
  }

  return (
    <span className={cn("al-work-portal-mark text-xs font-semibold", PORTAL_COLORS[platform] ?? "bg-muted text-foreground")}>
      {platform.slice(0, 2)}
    </span>
  );
}

const WORKING_JOB_PLATFORMS: JobPlatform[] = ["LinkedIn", "InfoJobs", "Indeed", "Tecnoempleo", "Jooble"];

const OTHER_JOB_PLATFORMS: JobPlatform[] = jobPlatforms.filter((platform) => !WORKING_JOB_PLATFORMS.includes(platform));

const PortalLinkCard = memo(function PortalLinkCard({ platform }: { platform: JobPlatform }) {
  return (
    <a
      href={`https://www.${PORTAL_DOMAINS[platform]}`}
      target="_blank"
      rel="noreferrer"
      className="al-work-portal-link-card"
    >
      <PortalMark platform={platform} />
      <span className="al-work-portal-link-title truncate">{platform}</span>
      <ExternalLink className="al-work-portal-link-icon h-3.5 w-3.5" />
    </a>
  );
});

type WorkTab = "verified" | "portals" | "companies" | "candidaturas";

const WORK_TABS: [Exclude<WorkTab, "verified">, string][] = [
  ["portals", "Portales"],
  ["companies", "Empresas"],
  ["candidaturas", "Candidaturas"],
];

function Work({ store, actions }: { store: Store; actions: ReturnTypeActions }) {
  const [tab, setTab] = useState<WorkTab>("portals");
  const [expandedPortal, setExpandedPortal] = useState<JobPlatform | null>(null);
  const [companySearch, setCompanySearch] = useState("");
  const [companyView, setCompanyView] = useState<"all" | "favorites">("all");
  const [savedSearches, setSavedSearches] = useState<Record<string, SavedQuickSearch>>({});
  const [savedSearchesLoaded, setSavedSearchesLoaded] = useState(false);
  const [verifiedJobs, setVerifiedJobs] = useState<VerifiedJob[]>([]);
  const [verifiedJobsEnabled, setVerifiedJobsEnabled] = useState(false);
  const [verifiedJobsLoaded, setVerifiedJobsLoaded] = useState(false);
  const [verifiedJobBusyId, setVerifiedJobBusyId] = useState<string | null>(null);
  const workTabTouched = useRef(false);

  // Candidaturas state
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [appLoaded, setAppLoaded] = useState(false);
  const [appStatusFilter, setAppStatusFilter] = useState("");
  const [noteInput, setNoteInput] = useState<Record<string, string>>({});
  const [showManualForm, setShowManualForm] = useState(false);
  const [manualForm, setManualForm] = useState({ company_name: "", company_url: "", job_title: "", job_url: "" });

  const handleToggleWork = useCallback((p: JobPlatform) => setExpandedPortal((v) => v === p ? null : p), []);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/verified-jobs", { cache: "no-store" })
      .then(async (response) => response.ok ? response.json() : { enabled: false, jobs: [] })
      .then((payload) => {
        if (cancelled) return;
        setVerifiedJobsEnabled(Boolean(payload.enabled));
        setVerifiedJobs(Array.isArray(payload.jobs) ? payload.jobs : []);
        if (payload.enabled && !workTabTouched.current) setTab("verified");
      })
      .finally(() => { if (!cancelled) setVerifiedJobsLoaded(true); });
    return () => { cancelled = true; };
  }, []);

  const updateVerifiedJob = useCallback(async (job: VerifiedJob, action: VerifiedJobPrivateAction) => {
    setVerifiedJobBusyId(job.id);
    try {
      const response = await fetch(`/api/verified-jobs/${encodeURIComponent(job.id)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!response.ok) throw new Error("Verified job action failed");
      const payload = await response.json();
      setAppLoaded(false);
      if (action === "dismiss") {
        setVerifiedJobs((current) => current.filter((item) => item.id !== job.id));
        toast.success("Oferta ocultada");
      } else {
        setVerifiedJobs((current) => current.map((item) => item.id === job.id ? {
          ...item,
          isSaved: payload.state.isSaved,
          privateApplicationId: payload.state.id,
          privateApplicationStatus: payload.state.status,
        } : item));
        toast.success(action === "applied"
          ? "Candidatura marcada como aplicada"
          : action === "unsave"
            ? "Oferta quitada de guardados"
            : "Oferta guardada");
      }
    } catch {
      toast.error("No se pudo actualizar la oferta");
    } finally {
      setVerifiedJobBusyId(null);
    }
  }, []);

  useEffect(() => {
    if (tab !== "portals" || savedSearchesLoaded) return;
    let cancelled = false;
    getQuickSearchesAction().then((rows) => {
      if (cancelled) return;
      const map: Record<string, SavedQuickSearch> = {};
      for (const row of rows) {
        if (!map[row.platform]) map[row.platform] = row;
      }
      setSavedSearches(map);
      setSavedSearchesLoaded(true);
    });
    return () => { cancelled = true; };
  }, [tab, savedSearchesLoaded]);

  const handlePortalSearch = useCallback((platform: JobPlatform, keyword: string, location: string) => {
    setSavedSearches((prev) => ({ ...prev, [platform]: { platform, keyword, location } }));
    saveQuickSearchAction(platform, keyword, location).catch(() => {});
  }, []);

  const filteredCompanies = useMemo(() => store.companies.filter((company) => {
    if (companyView === "favorites" && !company.is_favorite) return false;
    const haystack = `${company.nombre} ${company.categoria ?? ""}`.toLowerCase();
    return !companySearch || haystack.includes(companySearch.toLowerCase());
  }), [store.companies, companySearch, companyView]);
  const favoriteCompanyCount = store.companies.filter((company) => company.is_favorite).length;

  const fetchApplications = useCallback(async () => {
    const res = await fetch("/api/job-radar");
    if (!res.ok) return;
    const d = await res.json();
    setApplications(d.applications ?? []);
    setAppLoaded(true);
  }, []);

  const updateAppStatus = useCallback(async (id: string, status: ApplicationStatus) => {
    await fetch(`/api/job-radar/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setApplications((prev) => prev.map((a) => a.id === id ? { ...a, status, is_new: false } : a));
  }, []);

  const submitNote = useCallback(async (id: string) => {
    const text = noteInput[id]?.trim();
    if (!text) return;
    await fetch(`/api/job-radar/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ note: text }),
    });
    const created_at = new Date().toISOString();
    setApplications((prev) => prev.map((a) => a.id === id ? { ...a, notes: [...(a.notes ?? []), { text, created_at }] } : a));
    setNoteInput((prev) => ({ ...prev, [id]: "" }));
  }, [noteInput]);

  const removeApplication = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/job-radar/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Error al eliminar");
      setApplications((prev) => prev.filter((a) => a.id !== id));
      toast.success("Candidatura eliminada");
    } catch {
      toast.error("Error al eliminar la candidatura");
    }
  }, []);

  const submitManual = useCallback(async () => {
    const { company_name, company_url, job_title, job_url } = manualForm;
    if (!company_name.trim() || !company_url.trim() || !job_title.trim()) return;
    try {
      const res = await fetch("/api/job-radar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ company_name, company_url, job_title, job_url }),
      });
      if (!res.ok) throw new Error("Error al añadir");
      const d = await res.json();
      setApplications((prev) => [d.application, ...prev]);
      setManualForm({ company_name: "", company_url: "", job_title: "", job_url: "" });
      setShowManualForm(false);
      toast.success("Candidatura añadida");
    } catch {
      toast.error("Error al añadir la candidatura");
    }
  }, [manualForm]);

  useEffect(() => {
    if (tab === "candidaturas" && !appLoaded) {
      fetchApplications();
    }
  }, [tab, appLoaded, fetchApplications]);

  const filteredApplications = useMemo(
    () => applications.filter((a) => !appStatusFilter || a.status === appStatusFilter),
    [applications, appStatusFilter],
  );
  const workTabs = useMemo<[WorkTab, string][]>(
    () => verifiedJobsEnabled ? [["verified", "Ofertas verificadas"], ...WORK_TABS] : WORK_TABS,
    [verifiedJobsEnabled],
  );

  return (
    <>
      <style>{workBrandCss}</style>
      <div className="al-work-tabs" style={{ marginTop: 8 }}>
        {workTabs.map(([id, label]) => (
          <button
            key={id}
            type="button"
            className={cn("al-work-tab", tab === id && "al-work-tab-active")}
            onClick={() => { workTabTouched.current = true; setTab(id); }}
          >
            {label}
          </button>
        ))}
      </div>

      {verifiedJobsEnabled && tab === "verified" && (
        verifiedJobsLoaded ? (
          <VerifiedJobsView jobs={verifiedJobs} busyId={verifiedJobBusyId} onAction={updateVerifiedJob} />
        ) : (
          <p className="text-sm text-muted-foreground">Cargando ofertas verificadas...</p>
        )
      )}

      {tab === "portals" && (
        <div className="space-y-6">
          <div className="space-y-3">
            <div>
              <p className="al-work-section-title">Búsqueda rápida</p>
              <p className="text-sm text-muted-foreground">
                Estos portales funcionan bien con nuestro buscador. Haz clic, escribe tu puesto y elige tu provincia (o activa teletrabajo) para abrir la búsqueda ya filtrada.
              </p>
            </div>
            <div className="al-work-portal-grid sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5">
              {WORKING_JOB_PLATFORMS.map((platform) => (
                <QuickJobSearchCard
                  key={platform}
                  platform={platform}
                  expanded={expandedPortal === platform}
                  onToggle={handleToggleWork}
                  saved={savedSearches[platform]}
                  onSearch={handlePortalSearch}
                />
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <p className="al-work-section-title">Otros portales</p>
              <p className="text-sm text-muted-foreground">
                Estos no filtran bien desde aquí, así que te llevan directos a su web para que busques allí.
              </p>
            </div>
            <div className="al-work-portal-link-grid sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5">
              {OTHER_JOB_PLATFORMS.map((platform) => (
                <PortalLinkCard key={platform} platform={platform} />
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === "companies" && (
        <div className="space-y-4">
          <div className="al-work-companies-toolbar">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input className="pl-9" value={companySearch} onChange={(event) => setCompanySearch(event.target.value)} placeholder="Buscar empresa o categoria" />
            </div>
            <div className="al-work-company-views" role="group" aria-label="Vista de empresas">
              <button type="button" className={cn("al-work-company-view", companyView === "all" && "al-work-company-view-active")} onClick={() => setCompanyView("all")} aria-pressed={companyView === "all"}>
                Todas
              </button>
              <button type="button" className={cn("al-work-company-view", companyView === "favorites" && "al-work-company-view-active")} onClick={() => setCompanyView("favorites")} aria-pressed={companyView === "favorites"}>
                <Heart className="h-3.5 w-3.5" fill={companyView === "favorites" ? "currentColor" : "none"} />
                Favoritas {favoriteCompanyCount}
              </button>
            </div>
            {store.companies.length > 0 && (
              <span className="text-xs text-muted-foreground">{filteredCompanies.length} empresas</span>
            )}
          </div>

          {!store.companies.length ? (
            <div className="al-work-empty">
              <Building2 className="h-8 w-8 text-muted-foreground/40" />
              <p className="al-work-empty-title">Próximamente para tu ciclo</p>
              <p className="al-work-empty-desc">Todavía no tenemos empresas identificadas para tu familia profesional. Iremos añadiéndolas.</p>
            </div>
          ) : !filteredCompanies.length && companyView === "favorites" && !companySearch ? (
            <div className="al-work-empty">
              <Heart className="h-8 w-8 text-[#E15D2D]/50" />
              <p className="al-work-empty-title">Aún no tienes empresas favoritas</p>
              <p className="al-work-empty-desc">Marca el corazón de una empresa y aparecerá aquí al instante.</p>
            </div>
          ) : !filteredCompanies.length ? (
            <EmptyText>{companyView === "favorites" ? "No hay empresas favoritas con esa búsqueda." : "No hay empresas con esa búsqueda."}</EmptyText>
          ) : (
            <div className="al-work-company-grid">
              {filteredCompanies.map((company) => (
                <CompanyCard key={company.id} company={company} onToggleFavorite={() => actions.toggleCompanyFavorite(company.id)} />
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "candidaturas" && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => setAppStatusFilter("")}
                  className={cn("rounded-full border px-3 py-1 text-xs transition-colors", !appStatusFilter ? "al-action-soft-selected" : "hover:bg-muted")}
                >
                  Todas
                </button>
                {APPLICATION_STATUSES.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setAppStatusFilter((v) => v === s ? "" : s)}
                    className={cn("rounded-full border px-3 py-1 text-xs transition-colors", appStatusFilter === s ? "al-action-soft-selected" : "hover:bg-muted")}
                  >
                    {STATUS_LABELS[s]}
                  </button>
                ))}
              </div>
              <p className="mt-2 text-xs text-muted-foreground">Tu seguimiento es privado y solo aparece después de una acción tuya o una entrada manual.</p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setShowManualForm((v) => !v)}
                className="h-8 gap-1.5 text-xs"
              >
                <Plus className="h-3.5 w-3.5" />
                Añadir manual
              </Button>
            </div>
          </div>

          {showManualForm && (
            <Card className="p-4">
              <div className="space-y-3">
                <p className="text-sm font-medium">Añadir candidatura manual</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  <Input
                    placeholder="Empresa *"
                    value={manualForm.company_name}
                    onChange={(e) => setManualForm((f) => ({ ...f, company_name: e.target.value }))}
                  />
                  <Input
                    type="url"
                    inputMode="url"
                    placeholder="URL pagina empleo *"
                    value={manualForm.company_url}
                    onChange={(e) => setManualForm((f) => ({ ...f, company_url: e.target.value }))}
                  />
                  <Input
                    placeholder="Puesto *"
                    value={manualForm.job_title}
                    onChange={(e) => setManualForm((f) => ({ ...f, job_title: e.target.value }))}
                  />
                  <Input
                    type="url"
                    inputMode="url"
                    placeholder="URL oferta (opcional)"
                    value={manualForm.job_url}
                    onChange={(e) => setManualForm((f) => ({ ...f, job_url: e.target.value }))}
                  />
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={submitManual}>Guardar</Button>
                  <Button size="sm" variant="ghost" onClick={() => setShowManualForm(false)}>Cancelar</Button>
                </div>
              </div>
            </Card>
          )}

          {!appLoaded ? (
            <p className="text-sm text-muted-foreground">Cargando candidaturas...</p>
          ) : filteredApplications.length === 0 ? (
            <EmptyText>
              {appStatusFilter ? "Sin candidaturas con ese estado." : "Sin candidaturas. Guarda una oferta verificada o añade una manual."}
            </EmptyText>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">{filteredApplications.length} candidatura{filteredApplications.length !== 1 ? "s" : ""}</p>
              {filteredApplications.map((app) => (
                <CandidaturaCard
                  key={app.id}
                  app={app}
                  noteValue={noteInput[app.id] ?? ""}
                  onNoteChange={(v) => setNoteInput((prev) => ({ ...prev, [app.id]: v }))}
                  onNoteSubmit={() => submitNote(app.id)}
                  onStatusChange={updateAppStatus}
                  onDelete={removeApplication}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}

const CandidaturaCard = memo(function CandidaturaCard({
  app,
  noteValue,
  onNoteChange,
  onNoteSubmit,
  onStatusChange,
  onDelete,
}: {
  app: JobApplication;
  noteValue: string;
  onNoteChange: (v: string) => void;
  onNoteSubmit: () => void;
  onStatusChange: (id: string, status: ApplicationStatus) => void;
  onDelete: (id: string) => void;
}) {
  const [showNotes, setShowNotes] = useState(false);
  return (
    <div className={cn("rounded-lg border bg-card p-4 space-y-2", app.is_new && "border-blue-400/50")}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{app.company_name}</p>
          <p className="truncate text-xs text-muted-foreground">{app.job_title}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {app.is_new && <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />}
          <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", STATUS_COLORS[app.status])}>
            {STATUS_LABELS[app.status]}
          </span>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="text-xs text-muted-foreground">
          {new Date(app.detected_at).toLocaleDateString("es-ES")}
          {app.source === "manual" && " · Manual"}
        </span>
        {app.job_url && (
          <a
            href={app.job_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-0.5 text-xs text-muted-foreground hover:text-foreground hover:underline"
          >
            <ExternalLink className="h-3 w-3" />
            Ver oferta
          </a>
        )}
        <a
          href={app.company_url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-muted-foreground hover:text-foreground hover:underline"
        >
          Pagina empleo
        </a>
      </div>

      <div className="flex flex-wrap items-center gap-2 pt-0.5">
        <Select
          value={app.status}
          onChange={(e) => onStatusChange(app.id, e.target.value as ApplicationStatus)}
          className="h-7 text-xs"
        >
          {APPLICATION_STATUSES.map((s) => (
            <option key={s} value={s}>{STATUS_LABELS[s]}</option>
          ))}
        </Select>
        <button
          type="button"
          onClick={() => setShowNotes((v) => !v)}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          {app.notes?.length ? `${app.notes.length} nota${app.notes.length !== 1 ? "s" : ""}` : "Añadir nota"}
        </button>
        <button
          type="button"
          onClick={() => onDelete(app.id)}
          className="ml-auto text-xs text-muted-foreground hover:text-destructive"
        >
          Eliminar
        </button>
      </div>

      {showNotes && (
        <div className="space-y-1.5 pt-1">
          {app.notes?.map((n, i) => (
            <p key={i} className="text-xs text-muted-foreground">· {n.text}</p>
          ))}
          <div className="flex gap-2">
            <Input
              className="h-7 text-xs"
              placeholder="Escribe una nota..."
              value={noteValue}
              onChange={(e) => onNoteChange(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") onNoteSubmit(); }}
            />
            <Button size="sm" className="h-7 text-xs" onClick={onNoteSubmit}>
              Guardar
            </Button>
          </div>
        </div>
      )}
    </div>
  );
});

function EmptyText({ children }: { children: React.ReactNode }) {
  return <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">{children}</div>;
}

function CompanyCard({ company, onToggleFavorite }: { company: Company; onToggleFavorite: () => void }) {
  return (
    <div className="al-work-company-card">
      <div className="al-work-company-top">
        <div className="min-w-0">
          <p className="al-work-company-name">{company.nombre}</p>
          {company.categoria && <p className="al-work-company-category">{company.categoria}</p>}
        </div>
        <button
          type="button"
          className={cn("al-work-company-fav", company.is_favorite && "al-work-company-fav-active")}
          onClick={onToggleFavorite}
          aria-label={company.is_favorite ? "Quitar de favoritos" : "Guardar como favorita"}
          aria-pressed={company.is_favorite}
        >
          <Heart className="h-4 w-4" fill={company.is_favorite ? "currentColor" : "none"} />
        </button>
      </div>
      {company.granada_note && <p className="al-work-company-note">{company.granada_note}</p>}
      {company.web ? (
        <div className="al-work-company-actions">
          <a href={company.web} target="_blank" rel="noreferrer" className="al-work-company-btn al-work-company-btn-solid">
            Visitar web <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      ) : (
        <p className="al-work-company-hint">Todavía no tenemos web disponible para esta empresa.</p>
      )}
    </div>
  );
}

export function WorkFeature() {
  const { store, actions } = useStore();
  return (
    <FeaturePage eyebrow="Empleo y candidaturas" title="Trabajo" subtitle="Portales de búsqueda, tus empresas guardadas y el seguimiento de tus candidaturas.">
      <Work store={store} actions={actions} />
    </FeaturePage>
  );
}
