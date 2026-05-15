"use client"

import { useState, useEffect, useCallback } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Loader2, Tag, Trash2, Plus, Search, Link2, CheckCircle2 } from "lucide-react"
import { searchProductsForQuote } from "@/lib/quotation-actions"

// ─── Types ─────────────────────────────────────────────────────────────────────

interface AliasRow {
  id: string
  alias: string
  product_id: string
  source: string
  created_at: string
  products: { id: string; name: string; assigned_code: string | null }
  profiles: { full_name: string | null; email: string } | null
}

interface ProductResult {
  id: string
  name: string
  assigned_code: string | null
  price: number | null
}

// ─── Add Alias Modal ─────────────────────────────────────────────────────────

function AddAliasModal({
  open,
  onClose,
  onAdded,
}: {
  open: boolean
  onClose: () => void
  onAdded: () => void
}) {
  const [aliasText, setAliasText] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [results, setResults] = useState<ProductResult[]>([])
  const [selectedProduct, setSelectedProduct] = useState<ProductResult | null>(null)
  const [isSearching, setIsSearching] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [searched, setSearched] = useState(false)

  const handleSearch = useCallback(async () => {
    if (searchQuery.trim().length < 2) {
      toast.error("Enter at least 2 characters to search.")
      return
    }
    setIsSearching(true)
    setSearched(false)
    try {
      const data = await searchProductsForQuote(searchQuery.trim())
      setResults((data as ProductResult[]) ?? [])
      setSearched(true)
    } catch {
      toast.error("Product search failed.")
    } finally {
      setIsSearching(false)
    }
  }, [searchQuery])

  const handleSave = async () => {
    if (!aliasText.trim() || aliasText.trim().length < 2) {
      toast.error("Alias must be at least 2 characters.")
      return
    }
    if (!selectedProduct) {
      toast.error("Please select a product to link.")
      return
    }
    setIsSaving(true)
    try {
      const res = await fetch("/api/admin/inventory/aliases", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          alias: aliasText.trim(),
          product_id: selectedProduct.id,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success("Alias added successfully.")
      onAdded()
      handleClose()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to add alias"
      toast.error(message)
    } finally {
      setIsSaving(false)
    }
  }

  const handleClose = () => {
    setAliasText("")
    setSearchQuery("")
    setResults([])
    setSelectedProduct(null)
    setSearched(false)
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Product Alias</DialogTitle>
        </DialogHeader>
        <div className="space-y-5 mt-2">
          {/* Alias text */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Vendor Name / Alias</label>
            <Input
              id="alias-input"
              placeholder="e.g. Grey Hex 30, PWTILE-600..."
              value={aliasText}
              onChange={(e) => setAliasText(e.target.value)}
              autoFocus
            />
            <p className="text-xs text-muted-foreground">
              Exactly as written on the vendor delivery note. Matching is case-insensitive.
            </p>
          </div>

          {/* Product search */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Link to Internal Product</label>
            {selectedProduct ? (
              <div className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl border border-green-400/50 bg-green-50 dark:bg-green-900/20">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-foreground">{selectedProduct.name}</p>
                    <p className="text-xs text-muted-foreground">SKU: {selectedProduct.assigned_code || "N/A"}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedProduct(null)}
                  className="text-xs text-muted-foreground hover:text-destructive transition-colors"
                >
                  Change
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="alias-product-search"
                      placeholder="Search by name or SKU..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                      className="pl-9"
                    />
                  </div>
                  <Button
                    type="button"
                    onClick={handleSearch}
                    disabled={isSearching}
                    className="neu-raised border-transparent text-white shrink-0"
                  >
                    {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : "Search"}
                  </Button>
                </div>
                <div className="max-h-48 overflow-y-auto rounded-xl neu-inset p-1 min-h-[60px]">
                  {!searched && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Search for the internal product this alias maps to.
                    </p>
                  )}
                  {searched && results.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No products found.
                    </p>
                  )}
                  {results.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setSelectedProduct(p)}
                      className="w-full flex items-center justify-between gap-3 px-4 py-2.5 rounded-lg hover:bg-primary/10 transition-colors text-left"
                    >
                      <div>
                        <p className="text-sm font-medium text-foreground">{p.name}</p>
                        <p className="text-xs text-muted-foreground">SKU: {p.assigned_code || "N/A"}</p>
                      </div>
                      <Link2 className="h-4 w-4 text-muted-foreground shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={handleClose} className="neu-raised border-transparent">
              Cancel
            </Button>
            <Button
              id="alias-save-btn"
              type="button"
              onClick={handleSave}
              disabled={isSaving || !aliasText.trim() || !selectedProduct}
              className="neu-raised border-transparent text-white hover:text-white"
            >
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add Alias"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function AliasesPage() {
  const [aliases, setAliases] = useState<AliasRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")

  const loadAliases = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/inventory/aliases", { credentials: "include" })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setAliases(data.aliases ?? [])
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to load aliases"
      toast.error(message)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => { loadAliases() }, [loadAliases])

  const handleDelete = async (id: string, alias: string) => {
    if (!confirm(`Delete alias "${alias}"? This cannot be undone.`)) return
    setDeletingId(id)
    try {
      const res = await fetch(`/api/admin/inventory/aliases?id=${id}`, {
        method: "DELETE",
        credentials: "include",
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success(`Alias "${alias}" deleted.`)
      setAliases((prev) => prev.filter((a) => a.id !== id))
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Delete failed"
      toast.error(message)
    } finally {
      setDeletingId(null)
    }
  }

  const filtered = aliases.filter(
    (a) =>
      searchQuery === "" ||
      a.alias.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.products?.name?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl neu-raised">
            <Tag className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-serif font-bold text-foreground">Product Aliases</h1>
            <p className="text-sm text-muted-foreground">
              Map vendor delivery note names to internal products for automatic GRN matching.
            </p>
          </div>
        </div>
        <Button
          id="alias-add-btn"
          type="button"
          onClick={() => setModalOpen(true)}
          className="neu-raised border-transparent text-white gap-2"
        >
          <Plus className="h-4 w-4" />
          Add Alias
        </Button>
      </div>

      {/* Info banner */}
      <div className="rounded-xl border border-blue-400/30 bg-blue-50/50 dark:bg-blue-900/10 p-3">
        <p className="text-xs text-blue-700 dark:text-blue-400">
          <strong>How it works:</strong> When a delivery note is processed in GRN, each vendor product name is automatically matched against this alias table. Matches are auto-linked — staff don&apos;t need to manually search.
        </p>
      </div>

      {/* Search */}
      <div className="rounded-2xl neu-raised p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="alias-search"
            placeholder="Search aliases or product names..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl neu-raised p-5">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 space-y-2">
            <Tag className="h-10 w-10 text-muted-foreground mx-auto opacity-40" />
            <p className="text-sm text-muted-foreground">
              {aliases.length === 0
                ? "No aliases yet. Add your first alias to enable automatic GRN matching."
                : "No aliases match your search."}
            </p>
          </div>
        ) : (
          <>
            <p className="text-xs text-muted-foreground mb-4">
              {filtered.length} alias{filtered.length !== 1 ? "es" : ""}
            </p>
            {/* Desktop */}
            <div className="hidden md:block overflow-x-auto rounded-xl neu-inset">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-muted-foreground border-b border-border/40">
                  <tr>
                    <th className="px-4 py-3 min-w-[200px]">Vendor Alias</th>
                    <th className="px-4 py-3 min-w-[200px]">Internal Product</th>
                    <th className="px-4 py-3 w-28">SKU</th>
                    <th className="px-4 py-3 w-24">Source</th>
                    <th className="px-4 py-3 w-36">Added By</th>
                    <th className="px-4 py-3 w-12" />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((row) => (
                    <tr key={row.id} className="border-b border-border/30 last:border-0">
                      <td className="px-4 py-3">
                        <span className="font-mono text-sm bg-muted/50 px-2 py-0.5 rounded">
                          {row.alias}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-medium">{row.products?.name}</td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                        {row.products?.assigned_code || "—"}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          row.source === "imported"
                            ? "bg-blue-100 text-blue-700"
                            : "bg-muted/60 text-muted-foreground"
                        }`}>
                          {row.source}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {row.profiles?.full_name || row.profiles?.email || "—"}
                      </td>
                      <td className="px-4 py-3">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          disabled={deletingId === row.id}
                          onClick={() => handleDelete(row.id, row.alias)}
                          className="hover:text-destructive"
                        >
                          {deletingId === row.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile */}
            <div className="md:hidden space-y-3">
              {filtered.map((row) => (
                <div key={row.id} className="rounded-xl neu-raised p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-mono text-sm bg-muted/50 px-2 py-0.5 rounded break-all">
                      {row.alias}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      disabled={deletingId === row.id}
                      onClick={() => handleDelete(row.id, row.alias)}
                      className="shrink-0 hover:text-destructive"
                    >
                      {deletingId === row.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  <p className="text-sm font-medium text-foreground">{row.products?.name}</p>
                  <p className="text-xs text-muted-foreground">
                    SKU: {row.products?.assigned_code || "N/A"} · {row.source}
                  </p>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <AddAliasModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onAdded={loadAliases}
      />
    </div>
  )
}
