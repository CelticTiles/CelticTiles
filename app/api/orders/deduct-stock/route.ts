import { NextRequest, NextResponse } from "next/server"
import { createServerSupabase } from "@/lib/supabase/server"
import { getServerSession } from "@/lib/loaders"
import { deductStockForOrderItems } from "@/lib/secure-checkout"
import type { Json } from "@/supabase/database.types"

interface DeductStockBody {
  orderId?: string
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = (await request.json().catch(() => ({}))) as DeductStockBody
    const orderId = typeof body.orderId === "string" ? body.orderId.trim() : ""

    if (!orderId) {
      return NextResponse.json({ error: "Missing orderId" }, { status: 400 })
    }

    const supabase = await createServerSupabase()
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("id, user_id, items")
      .eq("id", orderId)
      .maybeSingle()

    if (orderError || !order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 })
    }

    const isStaff = session.userRole === "admin" || session.userRole === "sales"
    if (!isStaff && order.user_id !== session.userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const serverItems = Array.isArray(order.items)
      ? order.items.map((item: Json) => {
          const source =
            item && typeof item === "object" && !Array.isArray(item)
              ? (item as Record<string, unknown>)
              : {}

          return {
            product_id: String(source.product_id ?? ""),
            quantity: Number(source.quantity ?? 0),
          }
        })
      : []

    if (serverItems.length === 0) {
      return NextResponse.json({ error: "Order has no items" }, { status: 400 })
    }

    const results = await deductStockForOrderItems(supabase, serverItems)
    const success = results.every((result) => result.success)

    return NextResponse.json(
      {
        success,
        orderId,
        results,
      },
      { status: success ? 200 : 207 }
    )
  } catch (error) {
    console.error("[orders/deduct-stock] error:", error)
    return NextResponse.json({ error: "Failed to deduct stock" }, { status: 500 })
  }
}
