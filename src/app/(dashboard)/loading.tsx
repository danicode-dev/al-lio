export default function DashboardLoading() {
  return (
    <div className="animate-pulse space-y-5" role="status" aria-label="Cargando contenido">
      <div className="h-16 rounded-2xl bg-[var(--al-state-neutral-surface)]" />
      <div className="grid gap-4 xl:grid-cols-3">
        <div className="h-72 rounded-[20px] bg-[var(--al-state-neutral-surface)]" />
        <div className="h-72 rounded-[20px] bg-[var(--al-state-neutral-surface)]" />
        <div className="h-72 rounded-[20px] bg-[var(--al-state-neutral-surface)]" />
      </div>
      <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
        <div className="h-80 rounded-[20px] bg-[var(--al-state-neutral-surface)]" />
        <div className="h-80 rounded-[20px] bg-[var(--al-state-neutral-surface)]" />
      </div>
    </div>
  );
}
