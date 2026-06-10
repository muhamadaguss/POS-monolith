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
    <div className="flex items-center gap-4 rounded-2xl border border-gray-200 bg-white px-5 py-4">
      <div className={`flex size-12 shrink-0 items-center justify-center rounded-xl ${tint}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-sm text-gray-500">{label}</p>
        {value == null ? (
          <div className="mt-1 h-7 w-16 animate-pulse rounded bg-gray-100" />
        ) : (
          <p className="text-2xl font-bold tabular-nums text-gray-900">
            {value.toLocaleString('id-ID')}
          </p>
        )}
      </div>
    </div>
  );
}
