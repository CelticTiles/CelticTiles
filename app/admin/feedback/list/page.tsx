import { getServerSession } from "@/lib/loaders"
import { createServerSupabase } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import FeedbackClient, { type Feedback } from "./FeedbackClient"

export default async function FeedbackListPage() {
  const session = await getServerSession()

  if (!session.userId || (session.userRole !== "admin" && session.userRole !== "sales")) {
    redirect("/login")
  }

  const supabase = await createServerSupabase()

  // Native server-side fetch eliminates useFeedbacks hook
  const { data: feedbackData, error } = await supabase
    .from("feedbacks")
    .select(`
      *,
      responses:feedback_responses(*)
    `)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Admin Feedback Error:", error.message)
  }

  // Ensure robust formatting avoiding client-side layout crashes
  const formattedFeedbacks: Feedback[] = (feedbackData ?? []).map((f: any) => ({
    id: f.id,
    customer_id: f.customer_id,
    customer_name: f.customer_name ?? "Unknown Customer",
    customer_email: f.customer_email ?? "",
    subject: f.subject ?? "No Subject",
    category: f.category ?? "Support",
    message: f.message ?? "",
    priority: f.priority ?? "Low",
    status: f.status ?? "Open",
    assigned_to: f.assigned_to,
    created_at: f.created_at ?? new Date().toISOString(),
    responses: Array.isArray(f.responses) ? f.responses.sort((a: any, b: any) => 
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    ) : [],
  }))

  return <FeedbackClient initialFeedbacks={formattedFeedbacks} adminName={session.userName || "Admin"} />
}
