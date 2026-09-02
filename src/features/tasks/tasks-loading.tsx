export function TasksLoading() {
  return (
    <div className="animate-pulse space-y-5" role="status" aria-label="Cargando tareas">
      <div className="h-16 rounded-2xl bg-[var(--al-state-neutral-surface)]" />
      <div className="grid grid-cols-3 gap-3">
        <div className="h-24 rounded-[20px] bg-[var(--al-state-neutral-surface)]" />
        <div className="h-24 rounded-[20px] bg-[var(--al-state-neutral-surface)]" />
        <div className="h-24 rounded-[20px] bg-[var(--al-state-neutral-surface)]" />
      </div>
      <div className="h-80 rounded-[20px] bg-[var(--al-state-neutral-surface)]" />
    </div>
  );
}
