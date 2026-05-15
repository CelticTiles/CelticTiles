"use client"

import { useState, useEffect, useRef } from "react"
import { searchProductsForQuote } from "@/lib/quotation-actions"
import { Input } from "@/components/ui/input"
import { Loader2, Search } from "lucide-react"
import Image from "next/image"

interface QuotationProductSearchProps {
  onSelectProduct: (product: any) => void
}

export function QuotationProductSearch({ onSelectProduct }: QuotationProductSearchProps) {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (query.trim().length >= 2) {
        setIsLoading(true)
        try {
          const data = await searchProductsForQuote(query)
          setResults(data)
          setIsOpen(true)
        } catch (error) {
          console.error(error)
        } finally {
          setIsLoading(false)
        }
      } else {
        setResults([])
        setIsOpen(false)
      }
    }, 400)

    return () => clearTimeout(timer)
  }, [query])

  return (
    <div className="relative w-full" ref={wrapperRef}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          type="text"
          placeholder="Search product by name or SKU..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-9"
          onFocus={() => {
            if (results.length > 0) setIsOpen(true)
          }}
        />
        {isLoading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-gray-400" />
        )}
      </div>

      {isOpen && results.length > 0 && (
        <div className="absolute z-10 top-full mt-1 w-full bg-white rounded-md border shadow-lg max-h-[300px] overflow-auto">
          {results.map((product) => (
            <div
              key={product.id}
              className="flex items-center gap-3 p-3 hover:bg-gray-100 cursor-pointer border-b last:border-0"
              onClick={() => {
                onSelectProduct(product)
                setQuery("")
                setIsOpen(false)
                setResults([])
              }}
            >
              <div className="flex-1 min-w-0 py-1">
                <p className="text-sm font-medium text-slate-900 truncate">{product.name}</p>
                <p className="text-xs text-slate-500 truncate">SKU: {product.assigned_code || 'N/A'}</p>
              </div>
              <div className="text-sm font-semibold text-slate-900">
                €{product.price?.toFixed(2)}
              </div>
            </div>
          ))}
        </div>
      )}
      
      {isOpen && results.length === 0 && query.length >= 2 && !isLoading && (
        <div className="absolute z-10 top-full mt-1 w-full bg-white rounded-md border shadow-lg p-4 text-center text-sm text-gray-500">
          No products found matching "{query}"
        </div>
      )}
    </div>
  )
}
