export default function DashboardLoading() {
  return (
    <div className="animate-pulse space-y-5" aria-label="Cargando contenido">
      <div className="h-16 rounded-2xl bg-[#eeeae2]" />
      <div className="grid gap-4 xl:grid-cols-3">
        <div className="h-72 rounded-[20px] bg-[#eeeae2]" />
        <div className="h-72 rounded-[20px] bg-[#eeeae2]" />
        <div className="h-72 rounded-[20px] bg-[#eeeae2]" />
      </div>
      <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
        <div className="h-80 rounded-[20px] bg-[#eeeae2]" />
        <div className="h-80 rounded-[20px] bg-[#eeeae2]" />
      </div>
    </div>
  );
}
