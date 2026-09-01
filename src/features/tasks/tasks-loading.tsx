export function TasksLoading() {
  return (
    <div className="animate-pulse space-y-5" aria-label="Cargando tareas">
      <div className="h-16 rounded-2xl bg-[#eeeae2]" />
      <div className="grid grid-cols-3 gap-3">
        <div className="h-24 rounded-[20px] bg-[#eeeae2]" />
        <div className="h-24 rounded-[20px] bg-[#eeeae2]" />
        <div className="h-24 rounded-[20px] bg-[#eeeae2]" />
      </div>
      <div className="h-80 rounded-[20px] bg-[#eeeae2]" />
    </div>
  );
}
