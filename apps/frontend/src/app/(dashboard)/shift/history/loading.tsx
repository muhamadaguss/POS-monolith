/** Skeleton saat Server Component Riwayat Shift mem-fetch data. */
export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 w-48 bg-gray-200 rounded" />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="bg-white/80 dark:bg-gray-800/90 rounded-2xl border border-gray-100/80 dark:border-gray-700/50 p-5 h-28">
            <div className="w-10 h-10 rounded-xl bg-gray-100" />
            <div className="h-4 w-24 bg-gray-100 rounded mt-6" />
            <div className="h-6 w-20 bg-gray-200 rounded mt-2" />
          </div>
        ))}
      </div>
      <div className="bg-white/80 dark:bg-gray-800/90 rounded-2xl border border-gray-100/80 dark:border-gray-700/50 p-4 h-16" />
      <div className="bg-white/80 dark:bg-gray-800/90 rounded-2xl border border-gray-100/80 dark:border-gray-700/50 overflow-hidden">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-center gap-4 px-5 py-4 border-b border-gray-100">
            <div className="w-9 h-9 rounded-full bg-gray-100" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-40 bg-gray-200 rounded" />
              <div className="h-3 w-24 bg-gray-100 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
