export default function CategoryLoading() {
  return (
    <main className="bg-background min-h-screen">
      <div className="container mx-auto max-w-[1400px] px-4 py-12">
        {/* Header skeleton */}
        <div className="mb-4 border-b border-border pb-4">
          <div className="h-9 w-48 rounded-lg bg-slate-300 animate-pulse mb-2" />
          <div className="h-4 w-80 rounded-full bg-slate-200 animate-pulse" />
        </div>

        {/* Filters bar skeleton */}
        <div className="flex items-center gap-3 mb-8 flex-wrap">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-10 rounded-full bg-slate-200 animate-pulse"
              style={{ width: `${70 + i * 20}px` }}
            />
          ))}
          <div className="ml-auto h-10 w-36 rounded-full bg-slate-200 animate-pulse" />
        </div>

        {/* Product grid skeleton */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="space-y-3">
              {/* Product image */}
              <div
                className="aspect-square w-full rounded-2xl animate-pulse"
                style={{
                  background: '#E5E9F0',
                  boxShadow:
                    '6px 6px 12px rgba(0,0,0,0.1), -6px -6px 12px rgba(255,255,255,0.9)',
                }}
              />
              {/* Product name */}
              <div className="h-4 w-3/4 rounded-full bg-slate-300 animate-pulse" />
              {/* Product price */}
              <div className="h-5 w-20 rounded-full bg-slate-300 animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}
