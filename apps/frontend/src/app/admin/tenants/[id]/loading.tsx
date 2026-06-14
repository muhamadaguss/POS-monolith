/** Skeleton saat Server Component Detail Tenant mem-fetch data. */
export default function Loading() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-4 h-[60px]" />
      <div className="max-w-4xl mx-auto px-6 py-8 space-y-5 animate-pulse">
        <div className="h-40 bg-white rounded-2xl border border-gray-200" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-[72px] bg-white rounded-2xl border border-gray-200" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="h-28 bg-white rounded-2xl border border-gray-200" />
          <div className="h-28 bg-white rounded-2xl border border-gray-200" />
        </div>
        <div className="h-48 bg-white rounded-2xl border border-gray-200" />
      </div>
    </div>
  );
}
