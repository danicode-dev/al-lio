"use client";

import { ExternalLink, Heart } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Company } from "@/components/store/types";

export function CompanyCard({ company, onToggleFavorite }: { company: Company; onToggleFavorite: () => void }) {
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
