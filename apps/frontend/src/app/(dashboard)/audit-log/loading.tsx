/** Skeleton saat Server Component Riwayat Aktivitas mem-fetch data. */
export default function Loading() {
  return (
    <div className="space-y-5 animate-pulse">
      <div className="h-8 w-56 bg-gray-200 rounded" />
      <div className="flex gap-2">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-7 w-20 bg-gray-100 rounded-lg" />
        ))}
      </div>
      <div className="bg-white/80 dark:bg-gray-800/90 rounded-2xl border border-gray-100/80 dark:border-gray-700/50 overflow-hidden">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-4 py-4 border-b border-gray-100/50 dark:border-gray-700/30">
            <div className="h-4 w-32 bg-gray-100 rounded" />
            <div className="h-4 w-24 bg-gray-100 rounded" />
            <div className="h-6 w-20 bg-gray-100 rounded-full" />
            <div className="h-4 w-16 bg-gray-100 rounded ml-auto" />
          </div>
        ))}
      </div>
    </div>
  );
}
