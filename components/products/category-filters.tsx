"use client"

import Link from "next/link"
import { useState, useEffect } from "react"
import { usePathname, useSearchParams } from "next/navigation"
import { Check, ChevronDown, X } from "lucide-react"
import { cn } from "@/lib/utils"

// ─── Types ───────────────────────────────────────────────────────────────────

export interface FilterOption {
  label: string
  value: string
}

export interface FilterGroup {
  id: string
  label: string
  options: FilterOption[]
}

interface CategoryFiltersProps {
  pathname: string
  currentParams: Record<string, string>
  filterGroups: FilterGroup[]
  totalProducts: number
}

// ─── Sort Options ────────────────────────────────────────────────────────────

const SORT_OPTIONS: FilterOption[] = [
  { label: "Newest Arrivals", value: "newest" },
  { label: "Price: Low → High", value: "price_asc" },
  { label: "Price: High → Low", value: "price_desc" },
]

// ─── URL Builder ─────────────────────────────────────────────────────────────

function buildFilterUrl(
  pathname: string,
  currentParams: Record<string, string>,
  key: string,
  value: string | null
): string {
  const params = new URLSearchParams()

  // Copy existing params
  for (const [k, v] of Object.entries(currentParams)) {
    if (k !== key && k !== "page") params.set(k, v) // reset page on filter change
  }

  // Toggle: if same value, remove it; otherwise set it
  if (value !== null) {
    if (currentParams[key] === value) {
      // Already selected → remove (toggle off)
    } else {
      params.set(key, value)
    }
  }

  const qs = params.toString()
  return `${pathname}${qs ? `?${qs}` : ""}`
}

// ─── Component ───────────────────────────────────────────────────────────────

export function CategoryFilters({
  pathname,
  currentParams,
  filterGroups,
  totalProducts,
}: CategoryFiltersProps) {
  const [openDropdown, setOpenDropdown] = useState<string | null>(null)
  const currentPathname = usePathname()
  const searchParams = useSearchParams()

  // Close dropdown when URL changes (after navigation)
  useEffect(() => {
    setOpenDropdown(null)
  }, [currentPathname, searchParams])

  const activeFilterCount = filterGroups.filter(
    (g) => currentParams[g.id]
  ).length

  // Build clear-all URL (remove all filter keys, keep sort)
  const clearAllUrl = (() => {
    const params = new URLSearchParams()
    if (currentParams.sort) params.set("sort", currentParams.sort)
    const qs = params.toString()
    return `${pathname}${qs ? `?${qs}` : ""}`
  })()

  return (
    <div className="flex flex-col gap-4 py-4">
      {/* Top row: Filters + Sort */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {filterGroups.map((group) => {
            const selectedValue = currentParams[group.id] || null
            const isOpen = openDropdown === group.id
            const selectedLabel = group.options.find(
              (o) => o.value === selectedValue
            )?.label

            return (
              <div key={group.id} className="relative">
                {/* Trigger */}
                <button
                  onClick={() =>
                    setOpenDropdown(isOpen ? null : group.id)
                  }
                  className={cn(
                    "inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold transition-all duration-200",
                    "bg-[#E5E9F0] border-none",
                    selectedValue
                      ? "neu-inset text-primary"
                      : "neu-raised text-slate-700 hover:text-primary"
                  )}
                >
                  {group.label}
                  {selectedLabel && (
                    <span className="text-xs font-normal text-primary/70">
                      ({selectedLabel})
                    </span>
                  )}
                  <ChevronDown
                    className={cn(
                      "h-3.5 w-3.5 opacity-50 transition-transform",
                      isOpen && "rotate-180"
                    )}
                  />
                </button>

                {/* Dropdown */}
                {isOpen && (
                  <>
                    {/* Backdrop */}
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setOpenDropdown(null)}
                    />

                    {/* Menu */}
                    <div className="absolute top-full left-0 mt-2 z-50 w-52 py-2 bg-[#E5E9F0] neu-raised rounded-2xl shadow-lg animate-in fade-in slide-in-from-top-2 duration-200">
                      <div className="px-3 py-1.5 text-xs font-bold text-slate-500 uppercase tracking-wider">
                        {group.label}
                      </div>
                      <div className="h-px bg-slate-300/50 mx-2 my-1" />

                      {group.options.map((option) => {
                        const isSelected = selectedValue === option.value
                        const href = buildFilterUrl(
                          pathname,
                          currentParams,
                          group.id,
                          option.value
                        )

                        return (
                          <Link
                            key={option.value}
                            href={href}
                            prefetch={false}
                            className={cn(
                              "flex items-center justify-between px-3 py-2 mx-1 rounded-xl text-sm transition-colors",
                              isSelected
                                ? "bg-primary/10 text-primary font-semibold"
                                : "text-slate-700 hover:bg-white/50"
                            )}
                          >
                            {option.label}
                            {isSelected && (
                              <Check className="h-4 w-4 text-primary" />
                            )}
                          </Link>
                        )
                      })}

                      {/* Clear This Filter */}
                      {selectedValue && (
                        <>
                          <div className="h-px bg-slate-300/50 mx-2 my-1" />
                          <Link
                            href={buildFilterUrl(
                              pathname,
                              currentParams,
                              group.id,
                              selectedValue // toggle off
                            )}
                            prefetch={false}
                            className="flex items-center justify-center gap-1 px-3 py-1.5 mx-1 rounded-xl text-xs text-red-500 hover:bg-red-50/50 transition-colors"
                          >
                            <X className="h-3 w-3" />
                            Clear
                          </Link>
                        </>
                      )}
                    </div>
                  </>
                )}
              </div>
            )
          })}

          {/* Clear All */}
          {activeFilterCount > 0 && (
            <Link
              href={clearAllUrl}
              prefetch={false}
              className="inline-flex items-center gap-1 px-3 py-2 rounded-full text-xs font-semibold text-red-500 bg-red-50/50 hover:bg-red-100/50 transition-colors"
            >
              <X className="h-3 w-3" />
              Clear all
            </Link>
          )}
        </div>

        {/* Sort */}
        <div className="relative">
          <button
            onClick={() =>
              setOpenDropdown(openDropdown === "_sort" ? null : "_sort")
            }
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold bg-[#E5E9F0] neu-raised text-slate-700 hover:text-primary transition-all"
          >
            Sort by
            {currentParams.sort && (
              <span className="text-xs font-normal text-primary/70">
                (
                {SORT_OPTIONS.find((o) => o.value === currentParams.sort)
                  ?.label || ""}
                )
              </span>
            )}
            <ChevronDown
              className={cn(
                "h-3.5 w-3.5 opacity-50 transition-transform",
                openDropdown === "_sort" && "rotate-180"
              )}
            />
          </button>

          {openDropdown === "_sort" && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setOpenDropdown(null)}
              />
              <div className="absolute top-full right-0 mt-2 z-50 w-52 py-2 bg-[#E5E9F0] neu-raised rounded-2xl shadow-lg animate-in fade-in slide-in-from-top-2 duration-200">
                {SORT_OPTIONS.map((option) => {
                  const isSelected = currentParams.sort === option.value
                  const href = buildFilterUrl(
                    pathname,
                    currentParams,
                    "sort",
                    option.value
                  )

                  return (
                    <Link
                      key={option.value}
                      href={href}
                      prefetch={false}
                      className={cn(
                        "flex items-center justify-between px-3 py-2 mx-1 rounded-xl text-sm transition-colors",
                        isSelected
                          ? "bg-primary/10 text-primary font-semibold"
                          : "text-slate-700 hover:bg-white/50"
                      )}
                    >
                      {option.label}
                      {isSelected && (
                        <Check className="h-4 w-4 text-primary" />
                      )}
                    </Link>
                  )
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Product count */}
      <div className="text-sm text-muted-foreground">
        Showing {totalProducts} product{totalProducts !== 1 ? "s" : ""}
      </div>
    </div>
  )
}
