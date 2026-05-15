import { NextResponse } from "next/server"
import { createServerSupabase } from "@/lib/supabase/server"
import { getServerSession } from "@/lib/loaders"

function slugify(text: string) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-") // Replace spaces with -
    .replace(/[^\w-]+/g, "") // Remove all non-word chars
    .replace(/--+/g, "-") // Replace multiple - with single -
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession()
    if (!session || (session.userRole !== "admin" && session.userRole !== "sales" && session.userRole !== "inventory")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { items } = await req.json()
    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "Invalid items" }, { status: 400 })
    }

    const supabase = await createServerSupabase()
    const processedItems = []
    let createdCount = 0
    let updatedCount = 0

    for (const item of items) {
      let productId = item.product_id
      let currentStock = 0
      const receivedQty = Number(item.received_qty) || 0
      const price = Number(item.price) || null

      // 1. ATTEMPT MATCH if not linked
      if (!productId) {
        // Try SKU match
        if (item.sku) {
          const { data: skuMatch } = await supabase
            .from("products")
            .select("id, stock")
            .eq("assigned_code", item.sku)
            .single()
          
          if (skuMatch) {
            productId = skuMatch.id
            currentStock = skuMatch.stock || 0
          }
        }

        // Try Name match if SKU failed
        if (!productId && item.name) {
          const { data: nameMatch } = await supabase
            .from("products")
            .select("id, stock")
            .ilike("name", item.name)
            .single()
          
          if (nameMatch) {
            productId = nameMatch.id
            currentStock = nameMatch.stock || 0
          }
        }
      } else {
        // Fetch current stock for linked item
        const { data: linkedProd } = await supabase
          .from("products")
          .select("stock")
          .eq("id", productId)
          .single()
        currentStock = linkedProd?.stock || 0
      }

      // 2. CREATE NEW PRODUCT if still no match
      if (!productId) {
        const baseSlug = slugify(item.name || "new-product")
        const uniqueSlug = `${baseSlug}-${Math.random().toString(36).substring(2, 7)}`
        
        const { data: newProd, error: createError } = await supabase
          .from("products")
          .insert([
            {
              name: item.name || "Unnamed Product",
              slug: uniqueSlug,
              assigned_code: item.sku || null,
              price: price,
              stock: receivedQty, // Initial stock is the received qty
              status: "active"
            }
          ])
          .select("id")
          .single()

        if (createError) {
          console.error("Failed to create product:", createError)
          // Continue to next item but log error
          processedItems.push({ ...item, error: "Failed to create product" })
          continue
        }

        productId = newProd.id
        createdCount++
      } else {
        // 3. UPDATE EXISTING STOCK
        const { error: updateError } = await supabase
          .from("products")
          .update({ 
            stock: currentStock + receivedQty,
            // Optionally update price if provided and not set
            ...(price && { price }) 
          })
          .eq("id", productId)

        if (updateError) {
          processedItems.push({ ...item, error: "Failed to update stock" })
          continue
        }
        updatedCount++
      }

      processedItems.push({
        product_id: productId,
        name: item.name,
        sku: item.sku || null,
        expected_qty: item.expected_qty || receivedQty,
        received_qty: receivedQty,
        discrepancy: receivedQty - (item.expected_qty || receivedQty)
      })
    }

    // 4. LOG THE GRN
    await supabase.from("grn_logs").insert([
      {
        created_by: session.userId,
        items: processedItems,
        total_items: processedItems.length,
      },
    ])

    return NextResponse.json({
      success: true,
      processed: updatedCount,
      created: createdCount,
      total: processedItems.length
    })

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}