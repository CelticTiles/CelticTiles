import { getServerSession } from "@/lib/loaders"
import { redirect } from "next/navigation"
import { createServerSupabase } from "@/lib/supabase/server"
import CustomersListClient from "./CustomersListClient"

type CustomerRow = {
  id: string
  email: string
  full_name: string | null
  phone: string | null
  created_at: string
}

export interface CustomerData {
  id: string
  name: string
  email: string
  phone: string | null
  totalOrders: number
  totalSpent: number
  joinedAt: string
  lastOrderDate: string | null
}

export default async function CustomersListPage() {
  const session = await getServerSession()

  // Allow both admin and sales roles
  if (!session || (session.userRole !== "admin" && session.userRole !== "sales")) {
    redirect("/")
  }

  const supabase = await createServerSupabase()

  // Get customer role ID
  const { data: roleData, error: roleError } = await supabase
    .from('roles')
    .select('id')
    .eq('name', 'customer')
    .single<{ id: string }>()

  if (roleError || !roleData) {
    console.error('[Admin Customers] Role error:', roleError)
    throw new Error('Failed to fetch customer role')
  }

  // Fetch profiles
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id, email, full_name, phone, created_at')
    .eq('role_id', roleData.id)
    .order('created_at', { ascending: false })
    .returns<CustomerRow[]>()

  if (profilesError) {
    console.error('[Admin Customers] Profiles error:', profilesError)
    throw new Error(`Failed to load customers: ${profilesError.message}`)
  }

  // Fetch all orders
  const { data: orders, error: ordersError } = await supabase
    .from('orders')
    .select('user_id, total, created_at')
    .returns<Array<{ user_id: string | null; total: number | string; created_at: string }>>()

  if (ordersError) {
    console.error('[Admin Customers] Orders error:', ordersError)
    throw new Error(`Failed to load orders: ${ordersError.message}`)
  }

  // Process customers with order data
  const customers: CustomerData[] = (profiles || []).map(profile => {
    const userOrders = (orders || []).filter(o => o.user_id === profile.id)
    const totalOrders = userOrders.length
    const totalSpent = userOrders.reduce((sum, o) => sum + (parseFloat(o.total as any) || 0), 0)
    const lastOrder = userOrders.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]

    return {
      id: profile.id,
      name: profile.full_name || 'Unknown',
      email: profile.email,
      phone: profile.phone,
      totalOrders,
      totalSpent,
      joinedAt: profile.created_at,
      lastOrderDate: lastOrder?.created_at || null
    }
  })

  return <CustomersListClient initialCustomers={customers} />
}
