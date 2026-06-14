/** Skeleton saat Server Component Manajemen User mem-fetch data. */
export default function Loading() {
  return (
    <div className="space-y-5 animate-pulse">
      <div className="space-y-2">
        <div className="h-7 w-48 bg-gray-200 rounded" />
        <div className="h-4 w-72 bg-gray-100 rounded" />
      </div>
      <div className="flex gap-3">
        <div className="h-10 flex-1 max-w-md bg-gray-100 rounded-xl" />
        <div className="h-10 w-36 bg-gray-100 rounded-xl" />
        <div className="h-10 w-36 bg-gray-100 rounded-xl" />
      </div>
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-5 py-4 border-b border-gray-100">
            <div className="flex-1 space-y-2">
              <div className="h-4 w-40 bg-gray-200 rounded" />
              <div className="h-3 w-56 bg-gray-100 rounded" />
            </div>
            <div className="h-6 w-16 bg-gray-100 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
