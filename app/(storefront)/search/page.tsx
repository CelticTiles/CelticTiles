import { createServerSupabase } from "@/lib/supabase/server"
import SearchPageClient from "./SearchPageClient"

interface SearchPageProps {
  searchParams: Promise<{ q?: string }>
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const { q = "" } = await searchParams
  const query = q.trim()

  let results: any[] = []

  if (query) {
    const supabase = await createServerSupabase()
    const { data } = await supabase
      .from("products")
      .select("id, name, slug, price, image, description, stock, status, category_id")
      .ilike("name", `%${query}%`)
      .eq("status", "active")
      .limit(50)
    results = data || []
  }

  return <SearchPageClient query={query} initialResults={results} />
}
