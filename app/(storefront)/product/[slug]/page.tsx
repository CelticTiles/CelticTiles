import { notFound } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";
import ProductClient from "./ProductClient";
import { getServerSession } from "@/lib/loaders";
import type { Product } from "@/lib/supabase-types";

/* ---------------------------------------------------
   Helpers
--------------------------------------------------- */

// ✅ Normalize DB → Product type that matches ProductClient usage
function transformProduct(dbProduct: Record<string, unknown>): Product {
  const rawCategories = dbProduct.categories as
    | { name?: string | null; parent_id?: string | null }
    | null;

  const categories = rawCategories
    ? {
        name: rawCategories.name ?? "",
        parent_id: rawCategories.parent_id ?? null,
      }
    : null;

  // ✅ BUILD IMAGES ARRAY FROM product_images TABLE
  const productImages = (dbProduct.product_images as Array<any>) ?? [];
  const sortedImages = productImages.sort(
    (a, b) => (a.display_order ?? 0) - (b.display_order ?? 0)
  );
  const allImages =
    sortedImages.map((img) => img.image_url).filter(Boolean) || [];
  const primaryImage =
    sortedImages.find((img) => img.is_primary)?.image_url ||
    allImages[0] ||
    (dbProduct.image as string) ||
    null;

  const finalImages =
    allImages.length > 0
      ? allImages
      : dbProduct.image
      ? [(dbProduct.image as string)]
      : [];

  return {
    id: dbProduct.id as string,
    name: dbProduct.name as string,
    slug: dbProduct.slug as string,
    subtitle: (dbProduct.subtitle as string) ?? null,
    description: (dbProduct.description as string) ?? null,
    price: (dbProduct.price as number) || 0,

    image: primaryImage,
    images: finalImages,

    assigned_code: (dbProduct.assigned_code as string) ?? null,
    size: (dbProduct.size as string) ?? null,
    finish: (dbProduct.finish as string) ?? null,
    thickness: (dbProduct.thickness as string) ?? null,
    sqm_per_box: (dbProduct.sqm_per_box as string) ?? null,
    application_area: (dbProduct.application_area as string) ?? null,
    category_id: (dbProduct.category_id as string) ?? null,

    stock: (dbProduct.stock as number) || 0,
    low_stock_threshold: (dbProduct.low_stock_threshold as number) || 10,
    cost_price: (dbProduct.cost_price as number) ?? null,
    status: dbProduct.status as any,
    created_at: dbProduct.created_at as string,
    updated_at: dbProduct.updated_at as string,

    // ✅ fields missing in your error
    is_clearance: (dbProduct.is_clearance as boolean) ?? false,
    material: (dbProduct.material as string) ?? null,
    brand: (dbProduct.brand as string) ?? null,
    availability: (dbProduct.availability as string) ?? null,
    panel_length: (dbProduct.panel_length as string) ?? null,
    panel_width: (dbProduct.panel_width as string) ?? null,
    package_included: (dbProduct.package_included as string) ?? null,
    has_led: (dbProduct.has_led as boolean) ?? null,

    // extra / compatibility
    categories: categories as any,
  } as Product;
}

/* ---------------------------------------------------
   Page
--------------------------------------------------- */

export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createServerSupabase();

  // ✅ Session
  const session = await getServerSession();

  // ✅ Fetch product + images
  const { data: rawProduct } = await supabase
    .from("products")
    .select(
      `
      *,
      categories(name, parent_id),
      product_images!left(id, image_url, is_primary, display_order)
    `
    )
    .eq("slug", slug)
    .eq("status", "active")
    .single();

  if (!rawProduct) notFound();

  const product = transformProduct(rawProduct as Record<string, unknown>);

  // ✅ Related products + images
  const relatedQuery = supabase
    .from("products")
    .select(
      `
      *,
      categories(name, parent_id),
      product_images!left(id, image_url, is_primary, display_order)
    `
    )
    .eq("status", "active")
    .neq("id", product.id)
    .limit(4);

  if (product.category_id) {
    relatedQuery.eq("category_id", product.category_id);
  }

  const { data: rawRelatedProducts } = await relatedQuery;

  const relatedProducts = (rawRelatedProducts ?? []).map((p) =>
    transformProduct(p as Record<string, unknown>)
  );

  // ✅ Fetch published reviews server-side to bypass browser auth timing issues
  const { data: rawReviews } = await supabase
    .from("reviews")
    .select("*")
    .eq("product_id", product.id)
    .eq("status", "published")
    .order("created_at", { ascending: false })
    .limit(20);

  // ✅ Fetch profile names for all reviewers in one query
  const reviews = (rawReviews ?? []) as any[];
  const customerIds = [...new Set(reviews.map((r) => r.customer_id as string).filter(Boolean))];
  let profileNameMap: Record<string, string> = {};

  if (customerIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", customerIds);

    if (profiles) {
      profileNameMap = Object.fromEntries(
        (profiles as any[]).map((p) => [p.id, p.full_name ?? ""])
      );
    }
  }

  // Merge full_name into each review
  const initialReviews = reviews.map((r) => ({
    ...r,
    customer_name: profileNameMap[r.customer_id] || r.customer_name || null,
  }));

  return (
    <>
      <ProductClient
        product={product as any}
        relatedProducts={relatedProducts as any}
        session={session}
        initialReviews={initialReviews as any}
      />
    </>
  );
}
