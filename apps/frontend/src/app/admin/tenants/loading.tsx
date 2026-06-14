/** Skeleton saat Server Component Manajemen Tenant mem-fetch data. */
export default function Loading() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-4 h-[68px]" />
      <div className="max-w-6xl mx-auto px-6 py-8 space-y-5 animate-pulse">
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-[72px] bg-white rounded-2xl border border-gray-200" />
          ))}
        </div>
        <div className="flex gap-2">
          <div className="h-9 flex-1 bg-gray-100 rounded-lg" />
          <div className="h-9 w-36 bg-gray-100 rounded-lg" />
          <div className="h-9 w-36 bg-gray-100 rounded-lg" />
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
    </div>
  );
}
