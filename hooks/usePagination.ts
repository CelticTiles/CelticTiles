import { useState, useCallback, useEffect } from "react"

interface UsePaginationProps {
  totalItems: number
  itemsPerPage?: number
  initialPage?: number
}

export function usePagination({ 
  totalItems, 
  itemsPerPage = 10, 
  initialPage = 1 
}: UsePaginationProps) {
  const [currentPage, setCurrentPage] = useState(initialPage)

  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage))

  // Keep page in bounds without setting state during render.
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages)
      return
    }
    if (currentPage < 1) {
      setCurrentPage(1)
    }
  }, [currentPage, totalPages])

  const validCurrentPage = Math.min(Math.max(currentPage, 1), totalPages)

  const goToPage = useCallback((page: number) => {
    setCurrentPage(Math.min(Math.max(page, 1), totalPages))
  }, [totalPages])

  const nextPage = useCallback(() => {
    setCurrentPage((prev) => Math.min(prev + 1, totalPages))
  }, [totalPages])

  const prevPage = useCallback(() => {
    setCurrentPage((prev) => Math.max(prev - 1, 1))
  }, [])

  const startIndex = (validCurrentPage - 1) * itemsPerPage
  const endIndex = Math.min(startIndex + itemsPerPage, totalItems)

  return {
    currentPage: validCurrentPage,
    totalPages,
    nextPage,
    prevPage,
    goToPage,
    startIndex,
    endIndex,
    itemsPerPage
  }
}
