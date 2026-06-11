"use client"

import { useState, useEffect, useCallback } from "react"
import { Bell, Package, CheckCircle2, Truck, RefreshCw, XCircle, Clock, Star } from "lucide-react"
import { Button } from "@/components/ui/button"
import { formatOrderDate } from "@/lib/order-utils"
import Link from "next/link"
import { cn } from "@/lib/utils"

export interface OrderNotification {
  key: string          // unique: orderId + status + timestamp
  orderId: string
  orderNumber: string
  status: string
  note: string
  timestamp: string
  updatedBy: string
}

interface NotificationsClientProps {
  notifications: OrderNotification[]
  userId: string
}

function getStorageKey(userId: string) {
  return `notifications_read_${userId}`
}

function getReadSet(userId: string): Set<string> {
  try {
    const raw = localStorage.getItem(getStorageKey(userId))
    if (!raw) return new Set()
    return new Set(JSON.parse(raw))
  } catch {
    return new Set()
  }
}

function saveReadSet(userId: string, set: Set<string>) {
  try {
    localStorage.setItem(getStorageKey(userId), JSON.stringify([...set]))
  } catch {}
}

const STATUS_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string; bg: string }> = {
  Placed:      { label: "Order Placed",     icon: Star,         color: "text-purple-600",  bg: "bg-purple-100" },
  Pending:     { label: "Order Pending",    icon: Clock,        color: "text-yellow-600",  bg: "bg-yellow-100" },
  Confirmed:   { label: "Confirmed",        icon: CheckCircle2, color: "text-blue-600",    bg: "bg-blue-100"   },
  Processing:  { label: "Processing",       icon: RefreshCw,    color: "text-indigo-600",  bg: "bg-indigo-100" },
  Ready:       { label: "Ready",            icon: Package,      color: "text-cyan-600",    bg: "bg-cyan-100"   },
  Shipped:     { label: "Shipped",          icon: Truck,        color: "text-green-600",   bg: "bg-green-100"  },
  Delivered:   { label: "Delivered",        icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-100"},
  Cancelled:   { label: "Cancelled",        icon: XCircle,      color: "text-red-500",     bg: "bg-red-100"    },
}

function getConfig(status: string) {
  return STATUS_CONFIG[status] ?? { label: status, icon: Bell, color: "text-slate-500", bg: "bg-slate-100" }
}

function getStatusMessage(orderNumber: string, status: string): string {
  switch (status) {
    case "Placed":      return `Your order #${orderNumber} has been successfully placed.`
    case "Pending":     return `Your order #${orderNumber} is awaiting confirmation.`
    case "Confirmed":   return `Your order #${orderNumber} has been confirmed and is being prepared.`
    case "Processing":  return `Your order #${orderNumber} is now being processed.`
    case "Ready":       return `Your order #${orderNumber} is ready for dispatch.`
    case "Shipped":     return `Great news! Your order #${orderNumber} is on its way.`
    case "Delivered":   return `Your order #${orderNumber} has been delivered. Enjoy!`
    case "Cancelled":   return `Your order #${orderNumber} has been cancelled.`
    default:            return `Your order #${orderNumber} status has been updated to ${status}.`
  }
}

export default function NotificationsClient({ notifications, userId }: NotificationsClientProps) {
  const [readKeys, setReadKeys] = useState<Set<string>>(new Set())
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setReadKeys(getReadSet(userId))
    setMounted(true)
  }, [userId])

  const markAllRead = useCallback(() => {
    const allKeys = new Set(notifications.map(n => n.key))
    saveReadSet(userId, allKeys)
    setReadKeys(allKeys)
    // Dispatch event so sidebar badge updates
    window.dispatchEvent(new CustomEvent("notifications-read", { detail: { userId } }))
  }, [notifications, userId])

  const markOneRead = useCallback((key: string) => {
    setReadKeys(prev => {
      const next = new Set(prev)
      next.add(key)
      saveReadSet(userId, next)
      window.dispatchEvent(new CustomEvent("notifications-read", { detail: { userId } }))
      return next
    })
  }, [userId])

  const unreadCount = mounted ? notifications.filter(n => !readKeys.has(n.key)).length : 0

  if (notifications.length === 0) {
    return (
      <div className="p-12 rounded-[2rem] neu-raised bg-[#E5E9F0] border-none text-center h-full flex flex-col items-center justify-center min-h-[400px]">
        <div className="h-24 w-24 rounded-full bg-primary/10 flex items-center justify-center mb-6">
          <Bell className="h-10 w-10 text-primary opacity-60" />
        </div>
        <h2 className="text-2xl font-bold text-slate-800 mb-3">No Notifications Yet</h2>
        <p className="text-slate-500 font-medium max-w-sm mx-auto">
          Order updates and status changes will appear here once you place an order.
        </p>
        <Button asChild className="mt-8 rounded-full px-8 bg-primary text-white hover:bg-primary/90 font-bold">
          <Link href="/tiles">Start Shopping</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Notifications</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            {mounted && unreadCount > 0 ? (
              <span><span className="text-primary font-bold">{unreadCount} unread</span> · {notifications.length} total</span>
            ) : (
              <span>{notifications.length} notification{notifications.length !== 1 ? "s" : ""}</span>
            )}
          </p>
        </div>
        {mounted && unreadCount > 0 && (
          <Button
            variant="ghost"
            onClick={markAllRead}
            className="text-xs font-bold text-primary hover:bg-primary/10 rounded-full px-4 h-8"
          >
            Mark all as read
          </Button>
        )}
      </div>

      {/* Timeline */}
      <div className="space-y-3">
        {notifications.map((notif) => {
          const config = getConfig(notif.status)
          const Icon = config.icon
          const isRead = !mounted || readKeys.has(notif.key)

          return (
            <div
              key={notif.key}
              onClick={() => markOneRead(notif.key)}
              className={cn(
                "relative flex gap-4 p-5 rounded-2xl cursor-pointer transition-all duration-200",
                isRead
                  ? "neu-inset bg-[#E5E9F0]"
                  : "neu-raised bg-[#E5E9F0] hover:scale-[1.01]"
              )}
            >
              {/* Unread dot */}
              {!isRead && (
                <span className="absolute top-4 right-4 h-2.5 w-2.5 rounded-full bg-primary ring-2 ring-[#E5E9F0]" />
              )}

              {/* Icon */}
              <div className={cn("h-11 w-11 rounded-full flex items-center justify-center flex-shrink-0", config.bg)}>
                <Icon className={cn("h-5 w-5", config.color)} />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={cn("text-xs font-bold uppercase tracking-widest px-2 py-0.5 rounded-full", config.bg, config.color)}>
                    {config.label}
                  </span>
                </div>
                <p className={cn("mt-1 text-sm leading-snug", isRead ? "text-slate-500" : "text-slate-800 font-medium")}>
                  {getStatusMessage(notif.orderNumber, notif.status)}
                </p>
                {notif.note && (
                  <p className="text-xs text-slate-400 mt-1 italic">"{notif.note}"</p>
                )}
                <p className="text-[11px] text-slate-400 mt-2 font-medium">
                  {formatOrderDate(notif.timestamp)}
                </p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
