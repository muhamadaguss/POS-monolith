/** Skeleton saat Server Component Laporan Platform mem-fetch data. */
export default function Loading() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-4 h-[68px]" />
      <div className="max-w-6xl mx-auto px-6 py-8 space-y-6 animate-pulse">
        <div className="h-9 w-72 bg-gray-100 rounded-lg" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-[96px] bg-white rounded-2xl border border-gray-200" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="h-72 bg-white rounded-2xl border border-gray-200 lg:col-span-2" />
          <div className="h-72 bg-white rounded-2xl border border-gray-200" />
        </div>
      </div>
    </div>
  );
}
