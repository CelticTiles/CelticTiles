import { redirect } from "next/navigation"

// Redirect /admin/reviews to /admin/reviews/pending (default view)
export default function ReviewsPage() {
  redirect("/admin/reviews/pending")
}
