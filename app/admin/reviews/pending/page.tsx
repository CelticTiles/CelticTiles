import { createServerSupabase } from "@/lib/supabase/server"
import { ReviewsModeration } from "@/components/admin/ReviewsModeration"

export default async function PendingReviewsPage() {
  const supabase = await createServerSupabase()

  const { data } = await supabase
    .from("reviews")
    .select(`
      id,
      product_id,
      customer_id,
      customer_name,
      customer_email,
      rating,
      comment,
      created_at,
      admin_response,
      products(name, slug)
    `)
    .eq("status", "pending")
    .order("created_at", { ascending: true })

  
    const normalized = (data || []).map((r: any) => ({
  ...r,
  product_id: r.product_id ?? "",
  customer_id: r.customer_id ?? "",
  customer_name: r.customer_name ?? "",
  customer_email: r.customer_email ?? "",
  rating: r.rating ?? 0,
  comment: r.comment ?? "",
  products: r.products ?? { name: "", slug: "" },
}))

return <ReviewsModeration initialReviews={normalized} />
  
}