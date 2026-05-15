"use client"

import { useState, useEffect, useMemo } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Pagination } from "@/components/admin/Pagination"
import { usePagination } from "@/hooks/usePagination"
import {
  Loader2, ClipboardList, Printer, CheckCircle2,
  AlertTriangle, Search, ChevronDown
} from "lucide-react"

// ─── Types ─────────────────────────────────────────────────────────────────────

interface AuditProduct {
  id: string
  name: string
  assigned_code: string | null
  stock: number | null
  status: string | null
  categories: { name: string } | null
}

interface AuditRow {
  product_id: string
  product_name: string
  sku: string | null
  db_stock: number
  physical_count: number | ""
  category: string
}

// ─── Variance badge ────────────────────────────────────────────────────────────

function VarianceBadge({ variance }: { variance: number }) {
  if (variance === 0) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700">
        ✅ Match
      </span>
    )
  }
  if (Math.abs(variance) <= 5) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">
        ⚠ {variance > 0 ? "+" : ""}{variance}
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700">
      ❌ {variance > 0 ? "+" : ""}{variance}
    </span>
  )
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

const ITEMS_PER_PAGE = 20

export default function StockAuditPage() {
  const [products, setProducts] = useState<AuditProduct[]>([])
  const [rows, setRows] = useState<AuditRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [notes, setNotes] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [showResults, setShowResults] = useState(false)
  const [auditId, setAuditId] = useState<string | null>(null)

  // Load products on mount
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/admin/inventory/audit", { credentials: "include" })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error)
        setProducts(data.products ?? [])
        setRows(
          (data.products ?? []).map((p: AuditProduct) => ({
            product_id: p.id,
            product_name: p.name,
            sku: p.assigned_code,
            db_stock: p.stock ?? 0,
            physical_count: "",
            category: p.categories?.name ?? "Uncategorised",
          }))
        )
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to load products"
        toast.error(message)
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [])

  // Categories list for filter
  const categories = useMemo(() => {
    const cats = new Set(products.map((p) => p.categories?.name ?? "Uncategorised"))
    return ["all", ...Array.from(cats).sort()]
  }, [products])

  // Filtered + searched rows
  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      const matchesSearch =
        searchQuery === "" ||
        row.product_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (row.sku && row.sku.toLowerCase().includes(searchQuery.toLowerCase()))
      const matchesCategory =
        categoryFilter === "all" || row.category === categoryFilter
      return matchesSearch && matchesCategory
    })
  }, [rows, searchQuery, categoryFilter])

  // Pagination — operates on filteredRows for display only
  const { currentPage, totalPages, goToPage, startIndex, endIndex } = usePagination({
    totalItems: filteredRows.length,
    itemsPerPage: ITEMS_PER_PAGE,
  })

  // Reset to page 1 when filters change
  useEffect(() => { goToPage(1) }, [searchQuery, categoryFilter, goToPage])

  const pagedRows = filteredRows.slice(startIndex, endIndex)

  const updateCount = (productId: string, value: string) => {
    setRows((prev) =>
      prev.map((r) =>
        r.product_id === productId
          ? { ...r, physical_count: value === "" ? "" : parseInt(value, 10) || 0 }
          : r
      )
    )
  }

  // Rows with a physical count entered — from ALL rows, not just current page
  const countedRows = rows.filter((r) => r.physical_count !== "")
  const auditItems = countedRows.map((r) => ({
    ...r,
    physical_count: r.physical_count as number,
    variance: (r.physical_count as number) - r.db_stock,
  }))

  const discrepancies = auditItems.filter((r) => r.variance !== 0)

  const handleSubmit = async (applyCorrections: boolean) => {
    if (countedRows.length === 0) {
      toast.error("Enter physical counts for at least one product.")
      return
    }
    setIsSaving(true)
    try {
      const res = await fetch("/api/admin/inventory/audit", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: auditItems,
          notes,
          apply_corrections: applyCorrections,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setAuditId(data.audit_id)
      setShowResults(true)
      if (applyCorrections) {
        toast.success(`Audit saved. ${data.corrections_applied} stock correction${data.corrections_applied !== 1 ? "s" : ""} applied.`)
      } else {
        toast.success("Audit saved successfully.")
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Save failed"
      toast.error(message)
    } finally {
      setIsSaving(false)
    }
  }

  const handlePrint = () => { window.print() }

  // ── Loading ────────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  // ── Results view (after submission) ───────────────────────────────────────

  if (showResults) {
    return (
      <div className="space-y-6 pb-12">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl neu-raised">
              <ClipboardList className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-serif font-bold text-foreground">Audit Variance Report</h1>
              <p className="text-sm text-muted-foreground">
                Audit ID: <span className="font-mono text-xs">{auditId}</span>
              </p>
            </div>
          </div>
          <div className="flex gap-2 print:hidden">
            <Button type="button" variant="outline" onClick={() => { setShowResults(false); setNotes("") }} className="neu-raised border-transparent">
              New Audit
            </Button>
            <Button type="button" onClick={handlePrint} className="neu-raised border-transparent text-white gap-2">
              <Printer className="h-4 w-4" />
              Print Report
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 print:hidden">
          {[
            { label: "Items Counted", value: auditItems.length, color: "text-foreground" },
            { label: "Matches", value: auditItems.filter(r => r.variance === 0).length, color: "text-green-600" },
            { label: "Discrepancies", value: discrepancies.length, color: "text-amber-600" },
            { label: "Total Variance", value: discrepancies.reduce((a, r) => a + Math.abs(r.variance), 0), color: "text-red-600" },
          ].map((card) => (
            <div key={card.label} className="rounded-2xl neu-raised p-4">
              <p className="text-xs text-muted-foreground">{card.label}</p>
              <p className={`text-2xl font-bold mt-1 ${card.color}`}>{card.value}</p>
            </div>
          ))}
        </div>

        <div className="rounded-2xl neu-raised p-5">
          <h2 className="font-semibold text-foreground mb-4">
            Full Report — {auditItems.length} items audited
            {notes && <span className="text-sm text-muted-foreground font-normal ml-3">Note: {notes}</span>}
          </h2>
          <div className="overflow-x-auto rounded-xl neu-inset">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground border-b border-border/40">
                <tr>
                  <th className="px-4 py-3">Product</th>
                  <th className="px-4 py-3">SKU</th>
                  <th className="px-4 py-3 text-center">DB Stock</th>
                  <th className="px-4 py-3 text-center">Physical Count</th>
                  <th className="px-4 py-3 text-center">Variance</th>
                  <th className="px-4 py-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody>
                {auditItems.map((row) => (
                  <tr key={row.product_id} className={`border-b border-border/30 last:border-0 ${row.variance !== 0 ? "bg-amber-50/40 dark:bg-amber-900/10" : ""}`}>
                    <td className="px-4 py-3 font-medium">{row.product_name}</td>
                    <td className="px-4 py-3 text-muted-foreground font-mono text-xs">{row.sku || "—"}</td>
                    <td className="px-4 py-3 text-center">{row.db_stock}</td>
                    <td className="px-4 py-3 text-center font-semibold">{row.physical_count}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`font-semibold ${row.variance > 0 ? "text-blue-600" : row.variance < 0 ? "text-red-600" : "text-green-600"}`}>
                        {row.variance > 0 ? "+" : ""}{row.variance}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <VarianceBadge variance={row.variance} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    )
  }

  // ── Audit entry view ───────────────────────────────────────────────────────

  return (
    <div className="space-y-6 pb-24">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-xl neu-raised">
          <ClipboardList className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-serif font-bold text-foreground">Stock Audit</h1>
          <p className="text-sm text-muted-foreground">
            Enter physical counts. System compares against current DB stock and shows variance.
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="rounded-2xl neu-raised p-4 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="audit-search"
            placeholder="Search by name or SKU..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="relative">
          <select
            id="audit-category-filter"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="appearance-none pl-3 pr-8 py-2 rounded-xl border border-border bg-background text-sm neu-inset cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat === "all" ? "All Categories" : cat}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        </div>
        <p className="text-xs text-muted-foreground ml-auto">
          {filteredRows.length} of {rows.length} products
          {countedRows.length > 0 && (
            <span className="text-primary ml-2 font-medium">
              · {countedRows.length} counted
            </span>
          )}
        </p>
      </div>

      {/* Info */}
      <div className="flex items-start gap-3 rounded-xl border border-blue-400/30 bg-blue-50/50 dark:bg-blue-900/10 p-3">
        <AlertTriangle className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
        <p className="text-xs text-blue-700 dark:text-blue-400">
          Leave the count blank for products you are not auditing. Only products with a count entered will appear in the report.
        </p>
      </div>

      {/* Audit table */}
      <div className="rounded-2xl neu-raised p-5 space-y-4">
        {/* Desktop */}
        <div className="hidden md:block overflow-x-auto rounded-xl neu-inset">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground border-b border-border/40">
              <tr>
                <th className="px-4 py-3 min-w-[220px]">Product</th>
                <th className="px-4 py-3 w-36">SKU</th>
                <th className="px-4 py-3 w-28 text-center">DB Stock</th>
                <th className="px-4 py-3 w-40 text-center">Physical Count</th>
                <th className="px-4 py-3 w-28 text-center">Variance</th>
              </tr>
            </thead>
            <tbody>
              {pagedRows.map((row) => {
                const variance = row.physical_count !== "" ? (row.physical_count as number) - row.db_stock : null
                return (
                  <tr key={row.product_id} className="border-b border-border/30 last:border-0">
                    <td className="px-4 py-3">
                      <p className="font-medium text-foreground">{row.product_name}</p>
                      <p className="text-xs text-muted-foreground">{row.category}</p>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{row.sku || "—"}</td>
                    <td className="px-4 py-3 text-center font-semibold">{row.db_stock}</td>
                    <td className="px-4 py-3">
                      <Input
                        type="number"
                        min={0}
                        placeholder="—"
                        value={row.physical_count}
                        onChange={(e) => updateCount(row.product_id, e.target.value)}
                        onWheel={(e) => (e.target as HTMLElement).blur()}
                        className="w-28 mx-auto text-center"
                      />
                    </td>
                    <td className="px-4 py-3 text-center">
                      {variance !== null ? <VarianceBadge variance={variance} /> : <span className="text-xs text-muted-foreground">—</span>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="md:hidden space-y-3">
          {pagedRows.map((row) => {
            const variance = row.physical_count !== "" ? (row.physical_count as number) - row.db_stock : null
            return (
              <div key={row.product_id} className="rounded-xl neu-raised p-4 space-y-3">
                <div>
                  <p className="font-medium text-foreground text-sm">{row.product_name}</p>
                  <p className="text-xs text-muted-foreground">{row.sku || "No SKU"} · {row.category}</p>
                </div>
                <div className="grid grid-cols-3 gap-2 items-end">
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1">DB Stock</label>
                    <p className="text-center font-semibold">{row.db_stock}</p>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1">Physical</label>
                    <Input
                      type="number"
                      min={0}
                      placeholder="—"
                      value={row.physical_count}
                      onChange={(e) => updateCount(row.product_id, e.target.value)}
                      onWheel={(e) => (e.target as HTMLElement).blur()}
                      className="text-center"
                    />
                  </div>
                  <div className="flex justify-center">
                    {variance !== null ? <VarianceBadge variance={variance} /> : <span className="text-xs text-muted-foreground">—</span>}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={goToPage}
            totalItems={filteredRows.length}
            itemsPerPage={ITEMS_PER_PAGE}
          />
        )}
      </div>

      {/* Notes */}
      {countedRows.length > 0 && (
        <div className="rounded-2xl neu-raised p-5 space-y-3">
          <h2 className="font-semibold text-foreground">Audit Notes (optional)</h2>
          <Textarea
            id="audit-notes"
            placeholder="Any general observations about this audit..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="text-sm"
          />
        </div>
      )}

      {/* Bottom bar */}
      {countedRows.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 md:left-64 z-10 bg-card border-t border-border/30 p-4 flex items-center justify-between gap-3 shadow-lg">
          <div className="hidden sm:block">
            <p className="text-sm text-muted-foreground">
              {countedRows.length} products counted
              {discrepancies.length > 0 && (
                <span className="text-amber-600 ml-2">
                  · {discrepancies.length} discrepanc{discrepancies.length !== 1 ? "ies" : "y"}
                </span>
              )}
            </p>
          </div>
          <div className="flex gap-3 ml-auto">
            <Button type="button" variant="outline" onClick={() => handleSubmit(false)} disabled={isSaving} className="neu-raised border-transparent">
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Report Only"}
            </Button>
            {discrepancies.length > 0 && (
              <Button id="audit-apply-btn" type="button" onClick={() => handleSubmit(true)} disabled={isSaving} className="neu-raised border-transparent text-white hover:text-white gap-2">
                <CheckCircle2 className="h-4 w-4" />
                Save &amp; Apply Corrections
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
