export function StatCard({
  label,
  value,
  icon,
  tint,
}: {
  label: string;
  value: number | undefined;
  icon: React.ReactNode;
  tint: string;
}) {
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-gray-100/80 dark:border-gray-700/50 bg-white/80 dark:bg-gray-800/90 backdrop-blur-sm px-5 py-4 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 group">
      <div className={`flex size-12 shrink-0 items-center justify-center rounded-xl shadow-sm group-hover:shadow-md transition-shadow ${tint}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
        {value == null ? (
          <div className="mt-1 h-7 w-16 animate-pulse rounded bg-gray-100 dark:bg-gray-700" />
        ) : (
          <p className="text-2xl font-bold tabular-nums text-gray-900 dark:text-gray-100">
            {value.toLocaleString('id-ID')}
          </p>
        )}
      </div>
    </div>
  );
}
