import { NextResponse } from "next/server"
import { createServerSupabase } from "@/lib/supabase/server"
import { getServerSession } from "@/lib/loaders"

// POST /api/admin/inventory/grn/alias-match
// Body: { names: string[] }
// Returns: { [lowerCaseName]: { product_id, name, sku } }
//
// Called immediately after GRN "Process" to auto-link vendor names
// that exist in the product_aliases table.

export async function POST(req: Request) {
  try {
    // 1. AUTH
    const session = await getServerSession()
    if (!session || (session.userRole !== "admin" && session.userRole !== "sales" && session.userRole !== "inventory")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // 2. Parse body
    const { names } = await req.json()
    if (!Array.isArray(names) || names.length === 0) {
      return NextResponse.json({ matches: {} })
    }

    // 3. Normalise names to lowercase for matching
    const lowerNames = names.map((n: string) => n.toLowerCase().trim())

    const supabase = await createServerSupabase()

    // 4. Query product_aliases joined with products
    //    Match where lower(alias) is in our names list
    const { data, error } = await supabase
      .from("product_aliases" as never)
      .select(`
        alias,
        product_id,
        products!inner (
          id,
          name,
          assigned_code,
          price,
          stock
        )
      `)
      .in("alias" as never, lowerNames)

    if (error) {
      console.error("[alias-match] DB error:", error.message)
      return NextResponse.json({ matches: {} })
    }

    // 5. Build map: original_lower_name → { product_id, name, sku, price, stock }
    const matches: Record<string, { product_id: string; name: string; sku: string | null; price: number | null; stock: number | null }> = {}

    for (const row of (data ?? []) as Array<{
      alias: string
      product_id: string
      products: { id: string; name: string; assigned_code: string | null; price: number | null; stock: number | null }
    }>) {
      const key = row.alias.toLowerCase().trim()
      if (!matches[key]) {
        matches[key] = {
          product_id: row.product_id,
          name: row.products.name,
          sku: row.products.assigned_code,
          price: row.products.price,
          stock: row.products.stock,
        }
      }
    }

    return NextResponse.json({ matches })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Alias match failed"
    console.error("[alias-match]", message)
    return NextResponse.json({ matches: {} })
  }
}
