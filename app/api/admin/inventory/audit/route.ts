import { NextResponse } from "next/server"
import { createServerSupabase } from "@/lib/supabase/server"
import { getServerSession } from "@/lib/loaders"

// GET  /api/admin/inventory/audit  — load all products for audit form
// POST /api/admin/inventory/audit  — save completed audit

export async function GET() {
  try {
    const session = await getServerSession()
    if (!session || (session.userRole !== "admin" && session.userRole !== "sales" && session.userRole !== "inventory")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const supabase = await createServerSupabase()

    // Load all active + inactive products (not drafts) for audit
    const { data, error } = await supabase
      .from("products")
      .select("id, name, assigned_code, stock, status, category_id, categories(name)")
      .in("status", ["active", "inactive"])
      .order("name", { ascending: true })

    if (error) throw new Error(error.message)

    return NextResponse.json({ products: data ?? [] })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to load products"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession()
    if (!session || (session.userRole !== "admin" && session.userRole !== "sales" && session.userRole !== "inventory")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { items, notes, apply_corrections } = await req.json()

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "No audit items provided" }, { status: 400 })
    }

    // Validate each item has physical_count
    for (const item of items) {
      if (item.physical_count === undefined || item.physical_count === null) {
        return NextResponse.json(
          { error: `Missing physical_count for product: ${item.product_name}` },
          { status: 400 }
        )
      }
    }

    const supabase = await createServerSupabase()

    // Build canonical audit items with variance
    const auditItems = items.map((item: {
      product_id: string
      product_name: string
      sku: string | null
      db_stock: number
      physical_count: number
    }) => ({
      product_id: item.product_id,
      product_name: item.product_name,
      sku: item.sku,
      db_stock: item.db_stock,
      physical_count: item.physical_count,
      variance: item.physical_count - item.db_stock,
    }))

    // Save audit record
    const { data: audit, error: insertError } = await supabase
      .from("stock_audits" as never)
      .insert({
        created_by: session.userId,
        status: "submitted",
        items: auditItems,
        notes: notes || null,
      } as never)
      .select()
      .single()

    if (insertError) throw new Error(insertError.message)

    // Optionally apply corrections (update products.stock to match physical count)
    if (apply_corrections) {
      const corrections = auditItems.filter(
        (item: { variance: number }) => item.variance !== 0
      )

      for (const item of corrections as Array<{
        product_id: string
        physical_count: number
      }>) {
        await supabase
          .from("products")
          .update({ stock: item.physical_count })
          .eq("id", item.product_id)
      }

      return NextResponse.json({
        success: true,
        audit_id: (audit as { id: string }).id,
        corrections_applied: corrections.length,
      })
    }

    return NextResponse.json({
      success: true,
      audit_id: (audit as { id: string }).id,
      corrections_applied: 0,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Audit save failed"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
