"use client"

interface StatusBadgeProps {
  status: string
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const getVariant = (status: string) => {
    switch (status.toLowerCase()) {
      case "new":
        return "bg-blue-100 text-blue-700 border-blue-200"
      case "processing":
        return "bg-amber-100 text-amber-700 border-amber-200"
      case "ready":
        return "bg-purple-100 text-purple-700 border-purple-200"
      case "shipped":
        return "bg-indigo-100 text-indigo-700 border-indigo-200"
      case "delivered":
        return "bg-green-100 text-green-700 border-green-200"
      default:
        return "bg-gray-100 text-gray-700 border-gray-200"
    }
  }

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getVariant(status)}`}>
      {status.toUpperCase()}
    </span>
  )
}
