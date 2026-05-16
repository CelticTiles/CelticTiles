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

    const unmatchedItems: any[] = [];

    for (const item of items) {
      let productId = item.product_id;
      let currentStock = 0;
      const receivedQty = Number(item.received_qty) || 0;
      const price = Number(item.price) || null;

      // Attempt to match existing product if not already linked
      if (!productId) {
        // First, try to find a matching alias (SKU or name) in product_aliases
        const aliasValue = item.sku || item.name;
        if (aliasValue) {
          // const { data: aliasMatch } = await supabase
          //   .from('product_aliases')
          //   .select('product_id')
          //   .eq('alias', aliasValue)
          //   .single()
          const { data: aliasMatch } = await supabase
  .from("product_aliases")
  .select("product_id")
  .eq("alias", aliasValue)
  .maybeSingle();

if (aliasMatch?.product_id) {
  productId = aliasMatch.product_id;
}
            // .catch(() => ({ data: null }));
          // If an alias match was found, fetch its current stock
          if (productId && !currentStock) {
            const { data: prodStock } = await supabase
              .from('products')
              .select('stock')
              .eq('id', productId)
              .maybeSingle();
            currentStock = prodStock?.stock || 0;
          }
        }

        // If still no productId, fall back to SKU matching
        if (!productId && item.sku) {
          const { data: skuMatch } = await supabase
            .from('products')
            .select('id, stock')
            .eq('assigned_code', item.sku)
            .maybeSingle();
          if (skuMatch) {
            productId = skuMatch.id;
            currentStock = skuMatch.stock || 0;
            // Record alias for future fast lookup
            await supabase.from('product_aliases').insert([{ product_id: productId, alias: item.sku }]);
          }
        }

        // If still no productId, try matching by name
        if (!productId && item.name) {
          const { data: nameMatch } = await supabase
            .from('products')
            .select('id, stock')
            // .ilike('name', item.name)
            .ilike("name", `%${item.name}%`)
            .maybeSingle();
          if (nameMatch) {
            productId = nameMatch.id;
            currentStock = nameMatch.stock || 0;
            // Record alias for future fast lookup
            await supabase.from('product_aliases').insert([{ product_id: productId, alias: item.name }]);
          }
        }
      } else {
        // Linked product – fetch its current stock
        const { data: linkedProd } = await supabase
          .from('products')
          .select('stock')
          .eq('id', productId)
          .maybeSingle();
        currentStock = linkedProd?.stock || 0;
      }

      // If still no product match, collect for user decision
      if (!productId) {
        unmatchedItems.push({
          name: item.name,
          sku: item.sku,
          received_qty: receivedQty,
          price,
        });
        continue;
      }

      // Update stock for matched product
      const { error: updateError } = await supabase
        .from("products")
        .update({
          stock: currentStock + receivedQty,
          ...(price && { price }),
        })
        .eq("id", productId);

      if (updateError) {
        processedItems.push({ ...item, error: "Failed to update stock" });
        continue;
      }

      updatedCount++;

      processedItems.push({
        product_id: productId,
        name: item.name,
        sku: item.sku || null,
        expected_qty: item.expected_qty || receivedQty,
        received_qty: receivedQty,
        discrepancy: receivedQty - (item.expected_qty || receivedQty),
      });
    }

    // If there are unmatched items, return them for user action
    if (unmatchedItems.length > 0) {
      return NextResponse.json({
        success: false,
        message: "Some items could not be matched",
        unmatched: unmatchedItems,
        processed: processedItems.length,
        updated: updatedCount,
      }, { status: 200 });
    }

    console.log("Processed Items", processedItems);
    console.log("Unmatched Items", unmatchedItems);

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