import { redirect } from "next/navigation"
import { getServerSession } from "@/lib/loaders"
import { createServerSupabase } from "@/lib/supabase/server"
import NotificationsClient, { OrderNotification } from "./NotificationsClient"

export default async function NotificationsPage() {
    const session = await getServerSession()

    if (!session.userId) {
        redirect("/login")
    }

    const supabase = await createServerSupabase()

    // Fetch orders with status_history for this user
    const { data: orders } = await supabase
        .from("orders")
        .select("id, order_number, status_history, created_at")
        .eq("customer_id", session.userId)
        .order("created_at", { ascending: false })

    // Flatten status_history from all orders into a notification list
    const notifications: OrderNotification[] = []

    for (const order of (orders ?? [])) {
        const history = Array.isArray(order.status_history) ? order.status_history : []

        for (const entry of history as Array<{
            status: string
            note?: string
            timestamp?: string
            updated_by?: string
        }>) {
            if (!entry.status || !entry.timestamp) continue

            notifications.push({
                key: `${order.id}-${entry.status}-${entry.timestamp}`,
                orderId: order.id,
                orderNumber: order.order_number,
                status: entry.status,
                note: entry.note ?? "",
                timestamp: entry.timestamp,
                updatedBy: entry.updated_by ?? "system",
            })
        }
    }

    // Sort newest first
    notifications.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

    return (
        <NotificationsClient
            notifications={notifications}
            userId={session.userId}
        />
    )
}
