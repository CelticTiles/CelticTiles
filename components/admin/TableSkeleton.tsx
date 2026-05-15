import { Skeleton } from "@/components/ui/skeleton"


interface TableSkeletonProps {
  columnCount: number
  rowCount?: number
}

/**
 * TableSkeleton - Renders a full table with skeleton rows
 * Use this inside a CardContent or div for loading states
 */
export function TableSkeleton({ columnCount, rowCount = 5 }: TableSkeletonProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b-2 border-border bg-accent/5">
            {Array.from({ length: columnCount }).map((_, j) => (
              <th key={j} className="py-4 px-4">
                <Skeleton className="h-4 w-20" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rowCount }).map((_, i) => (
            <tr key={i} className="border-b border-border">
              {Array.from({ length: columnCount }).map((_, j) => (
                <td key={j} className="p-4">
                  <Skeleton className="h-4 w-full" />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/**
 * TableRowsSkeleton - Renders only tr elements for use inside an existing tbody
 */
export function TableRowsSkeleton({ columnCount, rowCount = 5 }: TableSkeletonProps) {
  return (
    <>
      {Array.from({ length: rowCount }).map((_, i) => (
        <tr key={i} className="border-b border-border">
          {Array.from({ length: columnCount }).map((_, j) => (
            <td key={j} className="p-4">
              <Skeleton className="h-4 w-full" />
            </td>
          ))}
        </tr>
      ))}
    </>
  )
}
