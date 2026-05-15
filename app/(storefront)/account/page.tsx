import { redirect } from "next/navigation"
import { getServerSession } from "@/lib/loaders"
import { createServerSupabase } from "@/lib/supabase/server"
import AccountClient from "./AccountClient"
import type { Database } from "@/lib/supabase-types"

type ProfileContact = Pick<Database["public"]["Tables"]["profiles"]["Row"], "full_name" | "phone">

export default async function AccountPage() {
    const session = await getServerSession()

    if (!session.userId) {
        redirect("/login")
    }

    // Fetch profile + orders server-side — no client hook needed
    const supabase = await createServerSupabase()
    const [{ data: profile }, { data: orders }, { count: orderCount }] = await Promise.all([
        supabase.from("profiles").select("full_name, phone").eq("id", session.userId).single(),
        supabase
            .from("orders")
            .select("id, order_number, status, total, created_at")
            .eq("customer_id", session.userId)
            .order("created_at", { ascending: false })
            .limit(3),
        supabase
            .from("orders")
            .select("id", { count: "exact", head: true })
            .eq("customer_id", session.userId),
    ])

    const typedProfile = profile as ProfileContact | null

    const recentOrders = (orders ?? []).map((o) => ({
        id: o.id,
        orderNumber: o.order_number,
        status: o.status ?? "",
        total: Number(o.total),
        created_at: o.created_at,
    }))

    return (
        <AccountClient
            session={session}
            initialFullName={typedProfile?.full_name ?? session.userName ?? ""}
            initialPhone={typedProfile?.phone ?? ""}
            orderCount={orderCount ?? recentOrders.length}
            recentOrders={recentOrders}
        />
    )
}
