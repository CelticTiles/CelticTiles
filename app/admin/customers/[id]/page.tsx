import { notFound } from "next/navigation"
import { createServerSupabase } from "@/lib/supabase/server"
import CustomerDetailClient from "./CustomerDetailClient"

interface Props {
  params: Promise<{ id: string }>
}

export default async function CustomerDetailPage(props: Props) {
  const { id } = await props.params
  const supabase = await createServerSupabase()

  // Fetch customer profile
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', id)
    .single()

  if (profileError || !profile) {
    notFound()
  }

  // Fetch customer orders
  const { data: orders } = await supabase
    .from('orders')
    .select('*')
    .eq('customer_id', id)
    .order('created_at', { ascending: false })

  // Fetch customer addresses
  const { data: addresses } = await supabase
    .from('customer_addresses')
    .select('*')
    .eq('user_id', id)
    .order('is_default', { ascending: false })

  return (
    <CustomerDetailClient
      customer={profile}
      orders={orders || []}
      addresses={addresses || []}
    />
  )
}
