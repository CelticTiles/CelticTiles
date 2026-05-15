import { ProductCard } from "@/components/products/product-card";
import { createServerSupabase } from "@/lib/supabase/server";
import type { Product } from "@/lib/supabase-types";

export const revalidate = 60

export default async function ClearancePage() {
  const supabase = await createServerSupabase();

  // ✅ FIXED: Fetch only clearance products (is_clearance = true)
  const { data } = await supabase
    .from("products")
    .select("id, name, slug, price, image, stock, material, status")
    .eq("status", "active")
    .eq("is_clearance", true) // ✅ Filter by boolean flag
    .order("price", { ascending: true });
  
  const clearanceProducts = (data || []) as Product[];

  return (
    <>
      <main className="min-h-screen bg-gray-50 py-12">
        <div className="container mx-auto px-4">
          {/* Header */}
          <div className="mb-12 text-center">
            <h1 className="text-4xl font-bold mb-4 uppercase tracking-tight">
              Clearance Sale
            </h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Amazing deals on premium tiles and flooring. Limited stock available.
            </p>
          </div>

          {/* Products Grid */}
          {clearanceProducts.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {clearanceProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-white rounded-lg">
              <p className="text-muted-foreground mb-4">
                No clearance products available at the moment.
              </p>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
