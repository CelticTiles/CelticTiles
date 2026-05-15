export default function ClearanceLoading() {
  return (
    <main className="bg-background min-h-screen">
      <div className="container mx-auto max-w-[1400px] px-4 py-12">
        {/* Header skeleton */}
        <div className="mb-4 border-b border-border pb-4">
          <div className="h-9 w-56 rounded-lg bg-slate-300 animate-pulse mb-2" />
          <div className="h-4 w-72 rounded-full bg-slate-200 animate-pulse" />
        </div>

        {/* Product grid skeleton */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="space-y-3">
              <div
                className="aspect-square w-full rounded-2xl animate-pulse"
                style={{
                  background: '#E5E9F0',
                  boxShadow:
                    '6px 6px 12px rgba(0,0,0,0.1), -6px -6px 12px rgba(255,255,255,0.9)',
                }}
              />
              <div className="h-4 w-3/4 rounded-full bg-slate-300 animate-pulse" />
              <div className="h-5 w-20 rounded-full bg-slate-300 animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}
