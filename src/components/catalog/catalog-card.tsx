import Link from "next/link";
import type { ReactNode } from "react";
import { Eye, Heart } from "lucide-react";

import { cn } from "@/lib/utils";

export function CatalogFact({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <span className="al-catalog-fact">
      {icon}
      <span className="truncate">{children}</span>
    </span>
  );
}

export function CatalogFavoriteButton({
  active,
  onClick,
  featured = false,
}: {
  active: boolean;
  onClick: () => void;
  featured?: boolean;
}) {
  return (
    <button
      type="button"
      className={cn(
        "al-catalog-heart",
        featured && "al-catalog-featured-heart",
        active && "al-catalog-heart-active",
      )}
      aria-label={active ? "Quitar de guardados" : "Guardar"}
      aria-pressed={active}
      onClick={onClick}
    >
      <Heart className={featured ? "h-4 w-4" : "h-3.5 w-3.5"} fill={active ? "currentColor" : "none"} />
    </button>
  );
}

export function CatalogDetailLink({ href, featured = false }: { href: string; featured?: boolean }) {
  return (
    <Link href={href} className={cn("al-catalog-detail-link", featured && "al-catalog-detail-link-featured")}>
      <Eye className="h-4 w-4" />Ver detalles
    </Link>
  );
}

export function CatalogCard({
  title,
  subtitle,
  badges,
  facts,
  detailHref,
}: {
  title: string;
  subtitle?: string;
  badges: ReactNode;
  facts: ReactNode;
  detailHref: string;
}) {
  return (
    <article className="al-catalog-card">
      <div className="al-catalog-card-top">
        <div className="al-catalog-card-title-wrap">
          <p className="al-catalog-card-title line-clamp-2" title={title}>
            {title}
          </p>
          {subtitle && (
            <p className="al-catalog-card-org line-clamp-1" title={subtitle}>
              {subtitle}
            </p>
          )}
        </div>
        <div className="al-catalog-card-badges">{badges}</div>
      </div>
      <div className="al-catalog-facts">{facts}</div>
      <div className="al-catalog-card-actions">
        <CatalogDetailLink href={detailHref} />
      </div>
    </article>
  );
}

export function CatalogFeaturedCard({
  imageSrc,
  imageAlt = "",
  tag,
  title,
  subtitle,
  status,
  favorite,
  description,
  facts,
  detailHref,
}: {
  imageSrc: string;
  imageAlt?: string;
  tag: ReactNode;
  title: string;
  subtitle?: string;
  status: ReactNode;
  favorite?: ReactNode;
  description?: string;
  facts: ReactNode;
  detailHref: string;
}) {
  return (
    <article className="al-catalog-featured">
      {favorite}
      <div className="al-catalog-featured-media">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={imageSrc} alt={imageAlt} />
        <span className="al-catalog-featured-tag">{tag}</span>
      </div>
      <div className="al-catalog-featured-body">
        <div className="al-catalog-featured-head">
          <div className="min-w-0">
            <p className="al-catalog-featured-title">{title}</p>
            {subtitle && <p className="al-catalog-featured-org">{subtitle}</p>}
          </div>
          {status}
        </div>
        {description && <p className="al-catalog-featured-desc line-clamp-3">{description}</p>}
        <div className="al-catalog-facts">{facts}</div>
        <div className="al-catalog-featured-actions">
          <CatalogDetailLink href={detailHref} featured />
        </div>
      </div>
    </article>
  );
}

export function CatalogPanel({
  title,
  children,
  className,
}: {
  title?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("al-catalog-panel", className)}>
      {title && <h2 className="text-sm font-bold text-[#111111]">{title}</h2>}
      {children}
    </section>
  );
}

export function CatalogInfoGrid({
  items,
}: {
  items: Array<{ label: string; value: ReactNode }>;
}) {
  return (
    <div className="al-catalog-info-grid">
      {items.map(({ label, value }) => (
        <div key={label}>
          <p className="al-catalog-info-k">{label}</p>
          <div className="al-catalog-info-v">{value}</div>
        </div>
      ))}
    </div>
  );
}

export function CatalogNextLink({
  href,
  title,
  meta,
  actionLabel,
}: {
  href: string;
  title: string;
  meta: string;
  actionLabel: string;
}) {
  return (
    <Link href={href} className="al-catalog-next">
      <p className="line-clamp-2 text-[12.5px] font-bold leading-5 text-[#111111]">{title}</p>
      <p className="text-[11px] text-[#6b6f72]">{meta}</p>
      <span className="text-[11px] font-bold text-[#b94720]">{actionLabel} →</span>
    </Link>
  );
}
