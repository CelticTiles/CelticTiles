export default function CartLoading() {
  return (
    <main className="bg-background min-h-screen">
      <div className="container mx-auto max-w-[1400px] px-4 py-12">
        {/* Header skeleton */}
        <div className="mb-8 border-b border-border pb-4">
          <div className="h-9 w-52 rounded-lg bg-slate-300 animate-pulse mb-2" />
          <div className="h-4 w-36 rounded-full bg-slate-200 animate-pulse" />
        </div>

        <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
          {/* Cart items skeleton */}
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="rounded-[1.5rem] p-5 flex items-center gap-5 animate-pulse"
                style={{
                  background: '#E5E9F0',
                  boxShadow:
                    '6px 6px 12px rgba(0,0,0,0.1), -6px -6px 12px rgba(255,255,255,0.9)',
                }}
              >
                {/* Image */}
                <div className="h-24 w-24 flex-shrink-0 rounded-xl bg-slate-300" />
                {/* Info */}
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-48 rounded-full bg-slate-300" />
                  <div className="h-3 w-24 rounded-full bg-slate-200" />
                  <div className="flex gap-2 mt-2">
                    <div className="h-9 w-9 rounded-xl bg-slate-300" />
                    <div className="h-9 w-10 rounded-xl bg-slate-300" />
                    <div className="h-9 w-9 rounded-xl bg-slate-300" />
                  </div>
                </div>
                {/* Price */}
                <div className="text-right space-y-2">
                  <div className="h-5 w-20 rounded-full bg-slate-300" />
                  <div className="h-3 w-14 rounded-full bg-slate-200" />
                </div>
              </div>
            ))}
          </div>

          {/* Order summary skeleton */}
          <div
            className="rounded-[2rem] p-7 h-fit space-y-5 animate-pulse"
            style={{
              background: '#E5E9F0',
              boxShadow:
                '6px 6px 12px rgba(0,0,0,0.1), -6px -6px 12px rgba(255,255,255,0.9)',
            }}
          >
            <div className="h-6 w-36 rounded-lg bg-slate-300" />
            <div className="space-y-3">
              <div className="flex justify-between">
                <div className="h-4 w-20 rounded-full bg-slate-200" />
                <div className="h-4 w-16 rounded-full bg-slate-300" />
              </div>
              <div className="flex justify-between">
                <div className="h-4 w-16 rounded-full bg-slate-200" />
                <div className="h-4 w-12 rounded-full bg-slate-300" />
              </div>
            </div>
            <div className="h-px bg-white/40" />
            <div className="flex justify-between">
              <div className="h-5 w-12 rounded-full bg-slate-300" />
              <div className="h-6 w-24 rounded-full bg-slate-300" />
            </div>
            <div className="h-12 w-full rounded-full bg-slate-300" />
            <div className="h-12 w-full rounded-full bg-slate-200" />
          </div>
        </div>
      </div>
    </main>
  )
}
