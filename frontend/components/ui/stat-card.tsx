export function StatCard({ title, value }: { title: string; value: number | string }) {
  return (
    <div className="p-4 rounded-xl bg-slate-800 border border-slate-700 flex flex-col">
      <span className="text-sm text-slate-400">{title}</span>
      <span className="text-2xl font-bold mt-1 text-white">
        {typeof value === "number" && value > 1000 ? (value / 1000).toFixed(1) + "k" : value}
      </span>
    </div>
  );
}
