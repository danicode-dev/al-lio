"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Search, SlidersHorizontal, X } from "lucide-react";

import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils";

export type CollectionTab = { id: string; label: string; count: number };

// The one control strip above the courses, events and news lists: a single
// line where the KPI counts and the status filter are the same thing - flat
// clickable stats with a hairline under the row, the active one underlined
// (menu-style, not a chunky button) - plus a search that is just its icon
// until used and the filters button pinned right. On phones the stats take
// the top as a 2x2 grid and the actions sit below.
//
// `extraActions` is for the page-specific button a route needs next to the
// filters one (the news route puts its reload action there); it renders
// inside the same cluster so it shares the row's height and wrapping.
export function CollectionControls({
  searchValue,
  onSearchChange,
  searchPlaceholder,
  tabs,
  activeTab,
  onTabChange,
  filterCount,
  filtersOpen,
  onToggleFilters,
  extraActions,
}: {
  searchValue: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder: string;
  tabs: CollectionTab[];
  activeTab: string;
  onTabChange: (id: string) => void;
  filterCount: number;
  filtersOpen: boolean;
  onToggleFilters: () => void;
  extraActions?: ReactNode;
}) {
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const searchExpanded = searchOpen || searchValue.length > 0;
  useEffect(() => {
    if (searchOpen) searchRef.current?.focus();
  }, [searchOpen]);

  return (
    <section className="al-cc">
      <style>{`
        .al-cc-strip { display: flex; align-items: flex-end; gap: 12px; padding-bottom: 10px; border-bottom: 1px solid #ece7dc; }
        .al-cc-strip-tabs { display: flex; align-items: stretch; gap: 2px; flex: 1 1 auto; min-width: 0; }
        .al-cc-stat { display: flex; flex-direction: column; align-items: flex-start; gap: 2px; flex: 1 1 0; min-width: 0; padding: 4px 10px 6px; border: none; border-bottom: 2px solid transparent; border-radius: 8px 8px 0 0; background: transparent; text-align: left; cursor: pointer; transition: background .15s, border-color .15s, color .15s; }
        .al-cc-stat:hover:not(.al-cc-stat-active) { background: #faf7f1; }
        .al-cc-stat-value { font-size: 19px; font-weight: 800; line-height: 1.05; color: #6b6f72; font-variant-numeric: tabular-nums; transition: color .15s; }
        .al-cc-stat-label { display: block; max-width: 100%; overflow: hidden; text-overflow: ellipsis; font-size: 10.5px; font-weight: 600; letter-spacing: .02em; color: #9a958a; white-space: nowrap; transition: color .15s; }
        .al-cc-stat-active { border-bottom-color: var(--al-action-soft-text); }
        .al-cc-stat-active .al-cc-stat-value { color: var(--al-action-soft-text-hover); }
        .al-cc-stat-active .al-cc-stat-label { color: var(--al-action-soft-text); }
        .al-cc-strip-actions { display: flex; gap: 8px; flex: 0 0 auto; align-items: center; padding-bottom: 2px; }
        .al-cc-search { position: relative; flex: 0 0 auto; width: 42px; transition: width .18s ease; }
        .al-cc-search.is-open { width: 240px; }
        .al-cc-search input { width: 100%; height: 42px; padding: 0 34px; border-radius: 12px; border: 1px solid #ece7dc; background: white; font-size: 13.5px; color: #333029; outline: none; transition: border-color .15s, box-shadow .15s; }
        .al-cc-search input::placeholder { color: #a59f94; }
        .al-cc-search input:focus { border-color: var(--al-action-soft-border-hover); box-shadow: 0 0 0 3px var(--al-action-soft-focus); }
        .al-cc-search:not(.is-open) input { opacity: 0; pointer-events: none; }
        .al-cc-search-toggle { position: absolute; left: 0; top: 0; z-index: 1; display: grid; place-items: center; width: 42px; height: 42px; padding: 0; border-radius: 12px; border: 1px solid #ece7dc; background: white; color: #6b6f72; cursor: pointer; transition: border-color .15s, color .15s; }
        .al-cc-search-toggle:hover { border-color: var(--al-action-soft-border-hover); color: var(--al-action-soft-text); }
        .al-cc-search-toggle svg { width: 16px; height: 16px; }
        .al-cc-search.is-open .al-cc-search-toggle { pointer-events: none; border-color: transparent; background: transparent; color: #9a958a; }
        .al-cc-search-clear { position: absolute; right: 7px; top: 50%; transform: translateY(-50%); display: grid; place-items: center; width: 22px; height: 22px; border-radius: 999px; border: none; background: transparent; color: #9a958a; cursor: pointer; z-index: 2; }
        .al-cc-search-clear:hover { background: #f3ece1; color: #333029; }
        .al-cc-search-clear svg { width: 13px; height: 13px; }
        .al-cc-filters { display: inline-flex; align-items: center; gap: 7px; height: 42px; padding: 0 14px; border-radius: 12px; border: 1px solid #ece7dc; background: white; color: #333029; font-size: 12.5px; font-weight: 600; cursor: pointer; white-space: nowrap; flex-shrink: 0; transition: border-color .15s, background .15s, color .15s; }
        .al-cc-filters:hover { border-color: var(--al-action-soft-border-hover); color: var(--al-action-soft-text); }
        .al-cc-filters:disabled { opacity: .6; cursor: default; }
        .al-cc-filters svg { width: 15px; height: 15px; }
        .al-cc-filters-badge { display: inline-grid; place-items: center; min-width: 18px; height: 18px; padding: 0 5px; border-radius: 999px; background: var(--al-action-soft-text); color: white; font-size: 10.5px; font-weight: 700; }
        @media (max-width: 640px) {
          .al-cc-strip { flex-wrap: wrap; align-items: stretch; gap: 12px 0; }
          /* phones: search + Filtros ride up under the header, the stat
             grid sits below them. */
          .al-cc-strip-actions { order: 1; width: 100%; justify-content: flex-end; }
          .al-cc-strip-tabs { order: 2; width: 100%; display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
          .al-cc-stat { border: 1px solid #ece7dc; border-radius: 10px; padding: 8px 10px; }
          .al-cc-stat-active { border-color: var(--al-action-soft-border-hover); background: var(--al-action-soft-bg); }
          .al-cc-search.is-open { width: auto; flex: 1 1 auto; }
        }
        @media (max-width: 420px) { .al-cc-filters-label { display: none; } .al-cc-filters { padding: 0 11px; } }
      `}</style>

      <div className="al-cc-strip">
        <div className="al-cc-strip-tabs" role="tablist">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                className={cn("al-cc-stat", isActive && "al-cc-stat-active")}
                onClick={() => onTabChange(tab.id)}
              >
                <span className="al-cc-stat-value">{tab.count}</span>
                <span className="al-cc-stat-label">{tab.label}</span>
              </button>
            );
          })}
        </div>
        <div className="al-cc-strip-actions">
          <div className={cn("al-cc-search", searchExpanded && "is-open")}>
            <button
              type="button"
              className="al-cc-search-toggle"
              onClick={() => setSearchOpen(true)}
              aria-label="Buscar"
              aria-expanded={searchExpanded}
              tabIndex={searchExpanded ? -1 : 0}
            >
              <Search />
            </button>
            <input
              ref={searchRef}
              value={searchValue}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder={searchPlaceholder}
              aria-label={searchPlaceholder}
              tabIndex={searchExpanded ? 0 : -1}
              onBlur={() => { if (!searchValue) setSearchOpen(false); }}
            />
            {searchValue && (
              <button type="button" className="al-cc-search-clear" onClick={() => onSearchChange("")} aria-label="Limpiar búsqueda">
                <X />
              </button>
            )}
          </div>
          {extraActions}
          <button
            type="button"
            className={cn("al-cc-filters", filtersOpen && "al-action-soft-selected")}
            onClick={onToggleFilters}
            aria-pressed={filtersOpen}
            aria-label={filterCount > 0 ? `Filtros, ${filterCount} activos` : "Filtros"}
          >
            <SlidersHorizontal />
            <span className="al-cc-filters-label">Filtros</span>
            {filterCount > 0 && <span className="al-cc-filters-badge">{filterCount}</span>}
          </button>
        </div>
      </div>
    </section>
  );
}

// A page-specific action rendered next to the filters button in the same
// strip, with the same box so the row keeps one height and one border
// language. Its label hides on narrow phones like the filters one.
export function CollectionAction({
  icon,
  label,
  onClick,
  disabled = false,
}: {
  icon: ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button type="button" className="al-cc-filters" onClick={onClick} disabled={disabled} aria-label={label}>
      {icon}
      <span className="al-cc-filters-label">{label}</span>
    </button>
  );
}

// The filters surface: a small dropdown that hangs off the Filtros button
// instead of a full-width block that pushes the whole list down. Its
// parent must carry `.al-cc-shell` so the panel can anchor to it; closes
// on Escape or a click outside that shell.
export function FilterPanelCompact({
  title = "Filtros",
  activeCount,
  onClear,
  onClose,
  children,
}: {
  title?: string;
  activeCount: number;
  onClear: () => void;
  onClose: () => void;
  children: ReactNode;
}) {
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    function onDown(event: PointerEvent) {
      const target = event.target as HTMLElement | null;
      if (!target?.closest?.(".al-cc-shell")) onClose();
    }
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onDown);
    };
  }, [onClose]);

  return (
    <div className="al-fp" role="dialog" aria-label={title}>
      <style>{`
        .al-cc-shell { position: relative; }
        .al-fp { position: absolute; z-index: 30; top: calc(100% + 8px); right: 0; width: 340px; max-width: calc(100vw - 32px); max-height: min(70vh, 520px); overflow-y: auto; background: white; border: 1px solid #e7e2d6; border-radius: 14px; box-shadow: 0 16px 40px rgba(17, 17, 17, 0.13), 0 2px 8px rgba(17, 17, 17, 0.05); padding: 14px 14px 16px; }
        @media (max-width: 560px) { .al-fp { left: 0; right: 0; width: auto; } }
        .al-fp-head { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; }
        .al-fp-title { flex: 1; font-size: 12.5px; font-weight: 800; color: #111111; }
        .al-fp-clear { border: none; background: none; padding: 0; font-size: 11.5px; font-weight: 700; color: var(--al-action-soft-text); cursor: pointer; }
        .al-fp-clear:hover { color: var(--al-action-soft-text-hover); }
        .al-fp-close { display: grid; place-items: center; width: 26px; height: 26px; border-radius: 8px; border: 1px solid #ece7dc; background: white; color: #6b6f72; cursor: pointer; transition: border-color .15s, color .15s; }
        .al-fp-close:hover { border-color: var(--al-action-soft-border-hover); color: var(--al-action-soft-text); }
        .al-fp-close svg { width: 13px; height: 13px; }
        .al-fp-body { display: flex; flex-direction: column; gap: 13px; }
        .al-fp-row-label { margin-bottom: 6px; font-size: 9.5px; font-weight: 800; text-transform: uppercase; letter-spacing: .07em; color: #9a958a; }
        .al-fp-date-toggle { display: inline-flex; align-items: center; gap: 6px; height: 30px; padding: 0 11px; border-radius: 9px; border: 1px solid #ece7dc; background: white; color: #333029; font-size: 11.5px; font-weight: 600; cursor: pointer; transition: border-color .15s, color .15s; }
        .al-fp-date-toggle:hover { border-color: var(--al-action-soft-border-hover); color: var(--al-action-soft-text); }
        .al-fp-date-toggle svg { width: 13px; height: 13px; }
        .al-fp-date-clear { border: none; background: none; padding: 0 0 0 8px; font-size: 11px; font-weight: 700; color: var(--al-action-soft-text); cursor: pointer; }
        .al-fp-date-cal { margin-top: 10px; }
        .al-filter-chip { max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; border-radius: 999px; border: 1px solid #ece7dc; background: white; color: #333029; padding: 4px 11px; font-size: 11.5px; font-weight: 600; cursor: pointer; transition: border-color 0.15s, color 0.15s; }
        .al-filter-chip:hover { border-color: rgba(225, 93, 45, 0.35); color: #c94f21; }
        .al-filter-chip-active, .al-filter-chip-active:hover { border-color: var(--al-action-soft-border-hover); background: var(--al-action-soft-bg-hover); color: var(--al-action-soft-text-hover); }
        .al-filter-day-selected, .al-filter-day-selected:hover { background: var(--al-action-soft-bg-hover); color: var(--al-action-soft-text-hover); }
        .al-filter-day-today { color: #c94f21; }
        .al-filter-dot { background: #E15D2D; }
      `}</style>
      <div className="al-fp-head">
        <span className="al-fp-title">{title}</span>
        {activeCount > 0 && (
          <button type="button" onClick={onClear} className="al-fp-clear">
            Limpiar ({activeCount})
          </button>
        )}
        <button type="button" onClick={onClose} className="al-fp-close" aria-label="Cerrar filtros">
          <X />
        </button>
      </div>
      <div className="al-fp-body">{children}</div>
    </div>
  );
}

export function FilterChips({ options, value, onChange }: { options: [string, string][]; value: string; onChange: (v: string) => void }) {
  const hasLong = options.some(([, l]) => l.length > 20) || options.length > 7;
  if (hasLong) {
    return (
      <Select value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </Select>
    );
  }
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map(([v, l]) => (
        <button
          key={v}
          type="button"
          title={l}
          onClick={() => onChange(value === v && v !== "" ? "" : v)}
          className={cn("al-filter-chip", value === v && "al-filter-chip-active")}
        >
          {l}
        </button>
      ))}
    </div>
  );
}
