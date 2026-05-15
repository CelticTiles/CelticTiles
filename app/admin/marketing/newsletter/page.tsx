"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Mail, Download, Search } from "lucide-react"
import { useState, useEffect, useMemo, useCallback } from "react"
import { getSupabaseBrowserClient } from "@/lib/supabase"
import { toast } from "sonner"
import type { NewsletterSubscription } from "@/lib/supabase-types"

export default function NewsletterSubscribersPage() {
  const supabase = getSupabaseBrowserClient()
  const [subscribers, setSubscribers] = useState<NewsletterSubscription[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")

  const fetchSubscribers = useCallback(async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('newsletter_subscriptions')
        .select('id, email, name, status, subscribed_at, unsubscribed_at')
        .order('subscribed_at', { ascending: false })

      if (error) {
        console.error('Fetch subscribers error:', error)
        toast.error('Failed to load subscribers')
        return
      }

      setSubscribers(data || [])
    } catch (error) {
      console.error('Fetch subscribers exception:', error)
      toast.error('An error occurred while loading subscribers')
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    fetchSubscribers()
  }, [fetchSubscribers])

  useEffect(() => {
    if (typeof window === "undefined") return

    const isAdminRoute = window.location.pathname.startsWith("/admin")
    if (!isAdminRoute) return

    const POLL_INTERVAL_MS = 15000
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        fetchSubscribers()
      }
    }, POLL_INTERVAL_MS)

    return () => window.clearInterval(timer)
  }, [fetchSubscribers])

  const filteredSubscribers = useMemo(() => {
    if (!searchQuery.trim()) return subscribers

    const query = searchQuery.toLowerCase()
    return subscribers.filter(sub => 
      sub.email.toLowerCase().includes(query) ||
      sub.name?.toLowerCase().includes(query)
    )
  }, [subscribers, searchQuery])

  const activeCount = subscribers.filter(s => s.status === 'active').length
  const unsubscribedCount = subscribers.filter(s => s.status !== 'active').length

  const exportToCSV = () => {
    try {
      const headers = ['Email', 'Name', 'Status', 'Subscribed Date', 'Unsubscribed Date']
      const rows = filteredSubscribers.map(sub => [
        sub.email,
        sub.name || '',
        sub.status,
        new Date(sub.subscribed_at).toLocaleDateString(),
        sub.unsubscribed_at ? new Date(sub.unsubscribed_at).toLocaleDateString() : ''
      ])

      const csv = [headers, ...rows].map(row => row.join(',')).join('\n')
      const blob = new Blob([csv], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `newsletter-subscribers-${new Date().toISOString().split('T')[0]}.csv`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('CSV exported successfully')
    } catch (error) {
      console.error('CSV export error:', error)
      toast.error('Failed to export CSV')
    }
  }

  return (
    <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-serif font-bold text-primary">Newsletter Subscribers</h1>
              <p className="text-muted-foreground mt-1">Manage your email subscribers</p>
            </div>
            <Button size="sm" variant="outline" onClick={exportToCSV} disabled={filteredSubscribers.length === 0}>
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Subscribers</p>
                    <p className="text-2xl font-bold mt-2">{subscribers.length}</p>
                  </div>
                  <Mail className="w-8 h-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Active</p>
                    <p className="text-2xl font-bold mt-2 text-green-600">{activeCount}</p>
                  </div>
                  <Mail className="w-8 h-8 text-green-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Unsubscribed</p>
                    <p className="text-2xl font-bold mt-2 text-gray-600">{unsubscribedCount}</p>
                  </div>
                  <Mail className="w-8 h-8 text-gray-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Subscribers List</CardTitle>
                <div className="relative w-64">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by email or name..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8 text-muted-foreground">Loading subscribers...</div>
              ) : filteredSubscribers.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {searchQuery ? 'No subscribers found matching your search' : 'No subscribers yet'}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4 font-semibold text-sm">Email</th>
                        <th className="text-left py-3 px-4 font-semibold text-sm">Name</th>
                        <th className="text-left py-3 px-4 font-semibold text-sm">Status</th>
                        <th className="text-left py-3 px-4 font-semibold text-sm">Subscribed Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredSubscribers.map((subscriber) => (
                        <tr key={subscriber.id} className="border-b hover:bg-muted/50">
                          <td className="py-3 px-4 text-sm">{subscriber.email}</td>
                          <td className="py-3 px-4 text-sm">{subscriber.name || '-'}</td>
                          <td className="py-3 px-4">
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold ${
                              subscriber.status === 'active' 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {subscriber.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-sm">
                            {new Date(subscriber.subscribed_at).toLocaleDateString('en-GB', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric'
                            })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
    </div>
  )
}
