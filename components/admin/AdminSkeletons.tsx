import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader } from "@/components/ui/card"

// ─── Shared Building Blocks ────────────────────────────────────────────────

export function PageHeaderSkeleton({ hasAction = false }: { hasAction?: boolean }) {
  return (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
      <div>
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-4 w-64 mt-2" />
      </div>
      {hasAction && <Skeleton className="h-9 w-32" />}
    </div>
  )
}

export function StatCardSkeleton() {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-20 mt-2" />
          </div>
          <Skeleton className="h-12 w-12 rounded-lg" />
        </div>
      </CardContent>
    </Card>
  )
}

function SearchFilterSkeleton() {
  return (
    <div className="flex gap-3 items-center">
      <Skeleton className="h-9 w-64 rounded-md" />
      <Skeleton className="h-9 w-40 rounded-md" />
    </div>
  )
}

function ChartCardSkeleton({ title }: { title?: boolean }) {
  return (
    <Card>
      <CardHeader>
        {title && <Skeleton className="h-5 w-32" />}
      </CardHeader>
      <CardContent>
        <Skeleton className="h-[250px] w-full rounded-md" />
      </CardContent>
    </Card>
  )
}

// ─── Table Skeleton (row-based for grid layouts) ───────────────────────────

function GridRowSkeleton({ columns }: { columns: number }) {
  return (
    <div className="grid gap-4 items-center px-4 py-3 border border-border rounded-lg"
      style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
      {Array.from({ length: columns }).map((_, i) => (
        <Skeleton key={i} className="h-4 w-full" />
      ))}
    </div>
  )
}

// ─── Page-Specific Skeletons ───────────────────────────────────────────────

export function DashboardSkeleton() {
  return (
    <div className="space-y-8">
      {/* Header + date range buttons */}
      <div className="flex justify-between items-center">
        <div>
          <Skeleton className="h-9 w-40" />
          <Skeleton className="h-4 w-72 mt-2" />
        </div>
        <div className="flex gap-2">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-8 w-16 rounded-md" />
          ))}
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map(i => <StatCardSkeleton key={i} />)}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCardSkeleton title />
        <ChartCardSkeleton title />
      </div>

      {/* Recent Orders Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-8 w-20 rounded-md" />
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  {["w-20", "w-28", "w-16", "w-20", "w-24"].map((w, i) => (
                    <th key={i} className="py-3 px-4">
                      <Skeleton className={`h-4 ${w}`} />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-border">
                    {["w-20", "w-28", "w-16", "w-20", "w-24"].map((w, j) => (
                      <td key={j} className="py-3 px-4">
                        <Skeleton className={`h-4 ${w}`} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export function OrdersListSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <PageHeaderSkeleton />
        <SearchFilterSkeleton />
      </div>
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-border bg-accent/5">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <th key={i} className="py-4 px-4">
                      <Skeleton className="h-4 w-20" />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="border-b border-border">
                    {Array.from({ length: 6 }).map((_, j) => (
                      <td key={j} className="p-4">
                        <Skeleton className="h-4 w-full" />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export function ProductsListSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <PageHeaderSkeleton />
        <Skeleton className="h-9 w-32 rounded-md" />
      </div>
      <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto justify-end">
        <SearchFilterSkeleton />
      </div>
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-36" />
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-border bg-accent/5">
                  {Array.from({ length: 7 }).map((_, i) => (
                    <th key={i} className="py-4 px-4">
                      <Skeleton className="h-4 w-20" />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="border-b border-border">
                    <td className="p-4"><Skeleton className="h-10 w-10 rounded" /></td>
                    {Array.from({ length: 6 }).map((_, j) => (
                      <td key={j} className="p-4">
                        <Skeleton className="h-4 w-full" />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export function CustomersListSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <PageHeaderSkeleton />
        <SearchFilterSkeleton />
      </div>
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-border bg-accent/5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <th key={i} className="py-4 px-4">
                      <Skeleton className="h-4 w-20" />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="border-b border-border">
                    {Array.from({ length: 5 }).map((_, j) => (
                      <td key={j} className="p-4">
                        <Skeleton className="h-4 w-full" />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export function TeamListSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <PageHeaderSkeleton />
        <Skeleton className="h-9 w-36 rounded-md" />
      </div>
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-36" />
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-border bg-accent/5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <th key={i} className="py-4 px-4">
                      <Skeleton className="h-4 w-20" />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-border">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <Skeleton className="h-10 w-10 rounded-full" />
                        <div>
                          <Skeleton className="h-4 w-28" />
                          <Skeleton className="h-3 w-36 mt-1" />
                        </div>
                      </div>
                    </td>
                    {Array.from({ length: 4 }).map((_, j) => (
                      <td key={j} className="p-4">
                        <Skeleton className="h-4 w-full" />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export function ReviewsSkeleton() {
  return (
    <div className="grid lg:grid-cols-3 gap-8">
      {/* Left sidebar - review list */}
      <div className="lg:col-span-1">
        <Skeleton className="h-6 w-40 mb-4" />
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="p-3 rounded-lg border border-border">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2 mt-2" />
              <div className="flex gap-0.5 mt-2">
                {[1, 2, 3, 4, 5].map(s => (
                  <Skeleton key={s} className="h-4 w-4 rounded-sm" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
      {/* Right panel - detail */}
      <div className="lg:col-span-2">
        <div className="bg-muted/20 rounded-lg p-6 border border-border">
          <Skeleton className="h-6 w-48 mb-2" />
          <Skeleton className="h-4 w-64 mb-4" />
          <div className="flex gap-0.5 mb-4">
            {[1, 2, 3, 4, 5].map(s => (
              <Skeleton key={s} className="h-5 w-5 rounded-sm" />
            ))}
          </div>
          <Skeleton className="h-4 w-24 mb-2" />
          <Skeleton className="h-20 w-full rounded-md mb-6" />
          <Skeleton className="h-4 w-40 mb-2" />
          <Skeleton className="h-24 w-full rounded-md mb-6" />
          <div className="flex gap-3">
            <Skeleton className="h-10 flex-1 rounded-lg" />
            <Skeleton className="h-10 flex-1 rounded-lg" />
          </div>
        </div>
      </div>
    </div>
  )
}

export function NewsletterSkeleton() {
  return (
    <>
      {/* Table header */}
      <div className="hidden md:grid grid-cols-12 gap-4 px-4 py-2 border-b border-border mb-2">
        {[4, 2, 2, 2, 2].map((span, i) => (
          <div key={i} className={`col-span-${span}`}>
            <Skeleton className="h-3 w-16" />
          </div>
        ))}
      </div>
      {/* Table rows */}
      <div className="space-y-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="grid grid-cols-1 md:grid-cols-12 gap-2 md:gap-4 items-center px-4 py-3 border border-border rounded-lg"
          >
            <div className="col-span-4 flex items-center gap-2">
              <Skeleton className="w-4 h-4 rounded-sm shrink-0" />
              <Skeleton className="h-4 w-48" />
            </div>
            <div className="col-span-2">
              <Skeleton className="h-4 w-20" />
            </div>
            <div className="col-span-2">
              <Skeleton className="h-5 w-14 rounded-full" />
            </div>
            <div className="col-span-2">
              <Skeleton className="h-4 w-20" />
            </div>
            <div className="col-span-2">
              <Skeleton className="h-4 w-20" />
            </div>
          </div>
        ))}
      </div>
    </>
  )
}

export function SettingsSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-4 w-72 mt-2" />
      </div>
      {[1, 2, 3].map(i => (
        <Card key={i}>
          <CardHeader>
            <Skeleton className="h-5 w-40" />
          </CardHeader>
          <CardContent className="space-y-4">
            {Array.from({ length: i === 3 ? 3 : 4 }).map((_, j) => (
              <div key={j}>
                <Skeleton className="h-4 w-28 mb-2" />
                <Skeleton className="h-9 w-full rounded-md" />
              </div>
            ))}
            <Skeleton className="h-9 w-32 rounded-md" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

export function ReportsSkeleton() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <Skeleton className="h-9 w-40" />
          <Skeleton className="h-4 w-64 mt-2" />
        </div>
        <div className="flex gap-2">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-8 w-16 rounded-md" />
          ))}
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map(i => <StatCardSkeleton key={i} />)}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCardSkeleton title />
        <ChartCardSkeleton title />
      </div>

      {/* Export buttons */}
      <div className="flex gap-3">
        <Skeleton className="h-9 w-36 rounded-md" />
        <Skeleton className="h-9 w-36 rounded-md" />
      </div>
    </div>
  )
}
