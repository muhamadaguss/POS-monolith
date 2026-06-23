/** Skeleton saat Server Component Laporan mem-fetch data. */
export default function Loading() {
  return (
    <div className="space-y-5 animate-pulse">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="space-y-2">
          <div className="h-7 w-48 bg-gray-200 dark:bg-gray-700 rounded" />
          <div className="h-4 w-64 bg-gray-100 dark:bg-gray-700 rounded" />
        </div>
        <div className="flex gap-2">
          <div className="h-9 w-44 bg-gray-100 dark:bg-gray-700 rounded-xl" />
          <div className="h-9 w-36 bg-gray-100 dark:bg-gray-700 rounded-xl" />
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-28 rounded-2xl bg-gray-100 dark:bg-gray-700" />
        ))}
      </div>

      <div className="h-10 w-full max-w-md bg-gray-100 dark:bg-gray-700 rounded" />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 h-72 rounded-2xl bg-gray-100 dark:bg-gray-700" />
        <div className="h-72 rounded-2xl bg-gray-100 dark:bg-gray-700" />
      </div>
    </div>
  );
}
