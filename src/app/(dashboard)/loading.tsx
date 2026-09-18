export default function DashboardLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-36 rounded-2xl bg-neutral-200/80" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 rounded-xl bg-neutral-100 border border-neutral-100" />
        ))}
      </div>
      <div className="h-48 rounded-xl bg-neutral-100 border border-neutral-100" />
      <div className="grid lg:grid-cols-2 gap-4">
        <div className="h-64 rounded-xl bg-neutral-100 border border-neutral-100" />
        <div className="h-64 rounded-xl bg-neutral-100 border border-neutral-100" />
      </div>
    </div>
  );
}
