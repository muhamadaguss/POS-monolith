/** Skeleton saat Server Component Transfer Stok mem-fetch data. */
export default function Loading() {
  return (
    <div className="space-y-5 animate-pulse">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="space-y-2">
          <div className="h-7 w-44 bg-gray-200 rounded" />
          <div className="h-4 w-64 bg-gray-100 rounded" />
        </div>
        <div className="h-9 w-36 bg-gray-100 rounded-xl" />
      </div>
      <div className="flex gap-2">
        <div className="h-10 flex-1 max-w-md bg-gray-100 rounded-xl" />
        <div className="h-10 w-40 bg-gray-100 rounded-xl" />
      </div>
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-16 rounded-xl bg-gray-100" />
        ))}
      </div>
    </div>
  );
}
