export default function ProductLoading() {
  return (
    <main className="min-h-screen bg-[#E5E9F0]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Breadcrumb skeleton */}
        <div className="flex items-center gap-2 mb-8">
          <div className="h-3 w-12 rounded-full bg-slate-300 animate-pulse" />
          <div className="h-3 w-2 rounded-full bg-slate-300 animate-pulse" />
          <div className="h-3 w-20 rounded-full bg-slate-300 animate-pulse" />
          <div className="h-3 w-2 rounded-full bg-slate-300 animate-pulse" />
          <div className="h-3 w-36 rounded-full bg-slate-300 animate-pulse" />
        </div>

        {/* Main grid — image + info */}
        <div className="grid lg:grid-cols-2 gap-12">

          {/* ── Left: Image gallery ── */}
          <div className="space-y-4">
            {/* Primary image */}
            <div
              className="w-full aspect-square rounded-2xl animate-pulse"
              style={{
                background: '#E5E9F0',
                boxShadow: '8px 8px 16px rgba(0,0,0,0.12), -8px -8px 16px rgba(255,255,255,0.9)',
              }}
            />
            {/* Thumbnails */}
            <div className="flex gap-3">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="w-20 h-20 rounded-xl animate-pulse"
                  style={{
                    background: '#E5E9F0',
                    boxShadow: '4px 4px 8px rgba(0,0,0,0.1), -4px -4px 8px rgba(255,255,255,0.9)',
                  }}
                />
              ))}
            </div>
          </div>

          {/* ── Right: Product info ── */}
          <div className="space-y-5">
            {/* Category badge */}
            <div className="h-5 w-24 rounded-full bg-slate-200 animate-pulse" />

            {/* Product name */}
            <div className="space-y-2">
              <div className="h-8 w-4/5 rounded-lg bg-slate-300 animate-pulse" />
              <div className="h-8 w-3/5 rounded-lg bg-slate-300 animate-pulse" />
            </div>

            {/* SKU */}
            <div className="h-4 w-40 rounded-full bg-slate-200 animate-pulse" />

            {/* Star rating */}
            <div className="flex items-center gap-2">
              {[1,2,3,4,5].map((i) => (
                <div key={i} className="w-4 h-4 rounded-sm bg-slate-300 animate-pulse" />
              ))}
              <div className="h-3 w-16 rounded-full bg-slate-200 animate-pulse" />
            </div>

            {/* Price */}
            <div className="space-y-1">
              <div className="h-9 w-32 rounded-lg bg-slate-300 animate-pulse" />
              <div className="h-3 w-28 rounded-full bg-slate-200 animate-pulse" />
            </div>

            {/* Stock badge */}
            <div className="flex gap-2">
              <div className="h-6 w-20 rounded-full bg-slate-200 animate-pulse" />
              <div className="h-6 w-12 rounded-full bg-slate-200 animate-pulse" />
            </div>

            {/* Description */}
            <div className="space-y-2 pt-2">
              <div className="h-3 w-full rounded-full bg-slate-200 animate-pulse" />
              <div className="h-3 w-full rounded-full bg-slate-200 animate-pulse" />
              <div className="h-3 w-4/5 rounded-full bg-slate-200 animate-pulse" />
              <div className="h-3 w-3/4 rounded-full bg-slate-200 animate-pulse" />
            </div>

            {/* Tile calculator box */}
            <div
              className="rounded-2xl p-5 space-y-3 animate-pulse"
              style={{
                background: '#E5E9F0',
                boxShadow: 'inset 4px 4px 8px rgba(0,0,0,0.08), inset -4px -4px 8px rgba(255,255,255,0.9)',
              }}
            >
              <div className="h-4 w-36 rounded-full bg-slate-300" />
              <div className="flex gap-3">
                <div className="flex-1 h-10 rounded-xl bg-slate-300" />
                <div className="flex-1 h-10 rounded-xl bg-slate-300" />
              </div>
              <div className="h-10 w-full rounded-xl bg-slate-300" />
            </div>

            {/* Add to cart button */}
            <div
              className="h-14 w-full rounded-2xl animate-pulse"
              style={{
                background: '#E5E9F0',
                boxShadow: '6px 6px 12px rgba(0,0,0,0.12), -6px -6px 12px rgba(255,255,255,0.9)',
              }}
            />

            {/* Trust badges */}
            <div className="flex gap-6 pt-2">
              {[1,2,3].map((i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-slate-300 animate-pulse" />
                  <div className="h-3 w-20 rounded-full bg-slate-200 animate-pulse" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Specs section ── */}
        <div className="mt-16 space-y-4">
          <div className="h-6 w-40 rounded-lg bg-slate-300 animate-pulse" />
          <div
            className="rounded-2xl p-6 grid grid-cols-2 md:grid-cols-3 gap-4 animate-pulse"
            style={{
              background: '#E5E9F0',
              boxShadow: '8px 8px 16px rgba(0,0,0,0.1), -8px -8px 16px rgba(255,255,255,0.9)',
            }}
          >
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="space-y-1">
                <div className="h-3 w-16 rounded-full bg-slate-300" />
                <div className="h-4 w-24 rounded-full bg-slate-200" />
              </div>
            ))}
          </div>
        </div>

        {/* ── Reviews section ── */}
        <div className="mt-16 space-y-6">
          <div className="h-7 w-52 rounded-lg bg-slate-300 animate-pulse" />
          <div className="grid lg:grid-cols-3 gap-12">
            {/* Review summary + list */}
            <div className="lg:col-span-2 space-y-4">
              <div
                className="rounded-2xl p-6 animate-pulse"
                style={{
                  background: '#E5E9F0',
                  boxShadow: '6px 6px 12px rgba(0,0,0,0.1), -6px -6px 12px rgba(255,255,255,0.9)',
                }}
              >
                <div className="flex gap-6">
                  <div className="space-y-2">
                    <div className="h-10 w-12 rounded-lg bg-slate-300" />
                    <div className="flex gap-1">
                      {[1,2,3,4,5].map(i => <div key={i} className="w-4 h-4 rounded bg-slate-300" />)}
                    </div>
                    <div className="h-3 w-16 rounded-full bg-slate-200" />
                  </div>
                  <div className="flex-1 space-y-2">
                    {[1,2,3,4,5].map(i => (
                      <div key={i} className="flex items-center gap-2">
                        <div className="h-2 w-6 rounded bg-slate-300" />
                        <div className="flex-1 h-2 rounded-full bg-slate-300" />
                        <div className="h-2 w-8 rounded bg-slate-200" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              {/* Individual review card */}
              <div
                className="rounded-2xl p-5 space-y-3 animate-pulse"
                style={{
                  background: '#E5E9F0',
                  boxShadow: '6px 6px 12px rgba(0,0,0,0.1), -6px -6px 12px rgba(255,255,255,0.9)',
                }}
              >
                <div className="h-4 w-32 rounded-full bg-slate-300" />
                <div className="flex gap-1">
                  {[1,2,3,4,5].map(i => <div key={i} className="w-4 h-4 rounded bg-slate-300" />)}
                </div>
                <div className="space-y-1">
                  <div className="h-3 w-full rounded-full bg-slate-200" />
                  <div className="h-3 w-5/6 rounded-full bg-slate-200" />
                </div>
              </div>
            </div>
            {/* Review form placeholder */}
            <div
              className="rounded-2xl p-6 space-y-4 animate-pulse"
              style={{
                background: '#E5E9F0',
                boxShadow: '8px 8px 16px rgba(0,0,0,0.1), -8px -8px 16px rgba(255,255,255,0.9)',
              }}
            >
              <div className="h-5 w-36 rounded-full bg-slate-300" />
              <div className="flex gap-1">
                {[1,2,3,4,5].map(i => <div key={i} className="w-6 h-6 rounded bg-slate-300" />)}
              </div>
              <div className="h-24 w-full rounded-xl bg-slate-300" />
              <div className="h-10 w-full rounded-xl bg-slate-300" />
            </div>
          </div>
        </div>

      </div>
    </main>
  )
}
