"use client"

import { useCallback, useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { EmptyState } from "@/components/admin/EmptyState"
import { Pagination } from "@/components/admin/Pagination"
import { usePagination } from "@/hooks/usePagination"
import { Mail, Download, Search } from "lucide-react"
import { toast } from "sonner"
import { IconSpinner } from "@/components/ui/icon-spinner"

interface Subscriber {
  id: string
  email: string
  name: string | null
  status: string
  subscribed_at: string
  unsubscribed_at: string | null
}

export default function NewsletterPage() {
  const [subscribers, setSubscribers] = useState<Subscriber[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")

  const fetchSubscribers = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/admin/newsletter', {
        method: 'GET',
        credentials: 'include',
        cache: 'no-store',
      })

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}))
        throw new Error(payload?.error || `Failed to fetch subscribers (${response.status})`)
      }

      const payload = await response.json()
      const data = Array.isArray(payload?.subscribers) ? payload.subscribers : []
      setSubscribers(data as Subscriber[])
    } catch (err: any) {
      const message = err?.message || 'Unknown error'
      setError(message)
      toast.error("Failed to load subscribers: " + message)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSubscribers()
  }, [fetchSubscribers])

  const filtered = subscribers.filter(
    (s) =>
      s.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.name && s.name.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  const {
    currentPage,
    totalPages,
    goToPage,
    startIndex,
    endIndex,
    itemsPerPage,
  } = usePagination({ totalItems: filtered.length, itemsPerPage: 15 })

  useEffect(() => {
    goToPage(1)
  }, [searchTerm, goToPage])

  const currentSubscribers = filtered.slice(startIndex, endIndex)

  const activeCount = subscribers.filter((s) => s.status === "active").length

  // CSV Export
  const handleExport = () => {
    if (subscribers.length === 0) {
      toast.error("No subscribers to export")
      return
    }

    const headers = ["Email", "Name", "Status", "Subscribed At", "Unsubscribed At"]
    const rows = subscribers.map((s) => [
      s.email,
      s.name || "",
      s.status,
      new Date(s.subscribed_at).toLocaleString(),
      s.unsubscribed_at ? new Date(s.unsubscribed_at).toLocaleString() : "",
    ])

    const csvContent = [
      headers.join(","),
      ...rows.map((r) => r.map((v) => `"${v}"`).join(",")),
    ].join("\n")

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `newsletter-subscribers-${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)

    toast.success(`Exported ${subscribers.length} subscribers to CSV`)
  }

  return (
    <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-3xl font-serif font-bold text-primary">Newsletter</h1>
              <p className="text-muted-foreground mt-1">
                {isLoading ? "Loading..." : `${subscribers.length} total · ${activeCount} active`}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search subscribers..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Button onClick={handleExport} variant="outline" disabled={subscribers.length === 0}>
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
            </div>
          </div>

          {/* Table */}
          <Card>
            <CardHeader>
              <CardTitle>Subscribers ({filtered.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex min-h-[40vh] items-center justify-center">
                  <IconSpinner label="Loading subscribers..." />
                </div>
                ) : error ? (
                  <div className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-red-900">
                    <p className="font-semibold">Failed to load newsletter subscribers</p>
                    <p className="text-sm mt-1">{error}</p>
                    <Button className="mt-3" size="sm" variant="outline" onClick={fetchSubscribers}>
                      Retry
                    </Button>
                  </div>
              ) : filtered.length === 0 ? (
                <EmptyState
                  icon={Mail}
                  title="No subscribers found"
                  description={searchTerm ? "Try adjusting your search terms." : "No one has subscribed yet."}
                  actionLabel={searchTerm ? "Clear Search" : undefined}
                  onAction={() => setSearchTerm("")}
                />
              ) : (
                <>
                  {/* Table Header */}
                  <div className="hidden md:grid grid-cols-12 gap-4 px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide border-b border-border mb-2">
                    <div className="col-span-4">Email</div>
                    <div className="col-span-2">Name</div>
                    <div className="col-span-2">Status</div>
                    <div className="col-span-2">Subscribed</div>
                    <div className="col-span-2">Unsubscribed</div>
                  </div>

                  {/* Rows */}
                  <div className="space-y-2">
                    {currentSubscribers.map((sub) => (
                      <div
                        key={sub.id}
                        className="grid grid-cols-1 md:grid-cols-12 gap-2 md:gap-4 items-center px-4 py-3 border border-border rounded-lg animate-in fade-in slide-in-from-bottom-2 duration-300"
                      >
                        <div className="col-span-4 flex items-center gap-2">
                          <Mail className="w-4 h-4 text-muted-foreground shrink-0" />
                          <span className="text-sm font-medium truncate">{sub.email}</span>
                        </div>
                        <div className="col-span-2 text-sm text-muted-foreground truncate">
                          {sub.name || "—"}
                        </div>
                        <div className="col-span-2">
                          <Badge variant={sub.status === "active" ? "success" : "secondary"}>
                            {sub.status}
                          </Badge>
                        </div>
                        <div className="col-span-2 text-sm text-muted-foreground">
                          {new Date(sub.subscribed_at).toLocaleDateString()}
                        </div>
                        <div className="col-span-2 text-sm text-muted-foreground">
                          {sub.unsubscribed_at
                            ? new Date(sub.unsubscribed_at).toLocaleDateString()
                            : "—"}
                        </div>
                      </div>
                    ))}
                  </div>

                  {totalPages > 1 && (
                    <Pagination
                      currentPage={currentPage}
                      totalPages={totalPages}
                      onPageChange={goToPage}
                      totalItems={filtered.length}
                      itemsPerPage={itemsPerPage}
                    />
                  )}
                </>
              )}
            </CardContent>
          </Card>
    </div>
  )
}
