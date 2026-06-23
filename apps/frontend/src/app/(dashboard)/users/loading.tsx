/** Skeleton saat Server Component Karyawan mem-fetch data. */
export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 w-40 bg-gray-200 rounded" />
      <div className="flex justify-between gap-3">
        <div className="h-10 w-full max-w-md bg-gray-100 rounded-xl" />
        <div className="h-10 w-48 bg-gray-100 rounded-xl" />
      </div>
      <div className="bg-white/80 dark:bg-gray-800/90 rounded-2xl border border-gray-100/80 dark:border-gray-700/50 overflow-hidden">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-6 py-4 border-b border-gray-100">
            <div className="w-10 h-10 rounded-full bg-gray-100" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-40 bg-gray-200 rounded" />
              <div className="h-3 w-56 bg-gray-100 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
