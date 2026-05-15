import { CheckCircle } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { createServerSupabase } from "@/lib/supabase/server"
import { getServerSession } from "@/lib/loaders"
import { ClearCartOnSuccess } from "./ClearCartOnSuccess"
import { ConfirmOrderEmail } from "./ConfirmOrderEmail"
import { redirect } from "next/navigation"
import type { Database } from "@/lib/supabase-types"
interface Props {
  searchParams: Promise<{ orderId?: string }>
}

type SuccessOrderRow = Pick<
  Database["public"]["Tables"]["orders"]["Row"],
  "order_number" | "total" | "payment_method" | "created_at" | "customer_name" | "customer_email"
>

function formatPrice(price: number) {
  return new Intl.NumberFormat('en-IE', {
    style: 'currency',
    currency: 'EUR'
  }).format(price)
}

function formatPaymentMethod(method: string | null | undefined) {
  if (!method) return 'Card Payment'
  if (method === 'card') return 'Card Payment'
  if (method === 'offline_cash') return 'Cash on Collection'
  return method
}

export default async function OrderSuccessPage({ searchParams }: Props) {
  const session = await getServerSession()
  if (!session.userId) {
    redirect("/login")
  }

  const { orderId } = await searchParams

  let order: SuccessOrderRow | null = null

  if (orderId) {
    const supabase = await createServerSupabase()
    const cols = 'order_number, total, payment_method, created_at, customer_name, customer_email'

    // Try by order_number first (ORD-... format used in success URL)
    const byNumber = await supabase
      .from('orders')
      .select(cols)
      .eq('order_number', orderId)
      .eq('user_id', session.userId)
      .maybeSingle()

    if (byNumber.data) {
      order = byNumber.data as SuccessOrderRow
    } else {
      // Fallback: try by primary key id (UUID or legacy ORD-... id)
      const byId = await supabase
        .from('orders')
        .select(cols)
        .eq('id', orderId)
        .eq('user_id', session.userId)
        .maybeSingle()
      if (byId.data) order = byId.data as SuccessOrderRow
    }
  }

  return (
    <div className="min-h-screen bg-neutral-light flex items-center justify-center p-4">
      <ClearCartOnSuccess />
      {/* ✅ Client component: calls /api/orders/confirm ONCE to verify payment + send email */}
      {order && <ConfirmOrderEmail orderNumber={order.order_number} />}
      <div className="max-w-md w-full bg-white rounded-lg shadow-card-hover p-8 text-center">
        <div className="mb-6 flex justify-center">
          <CheckCircle className="h-24 w-24 text-success" strokeWidth={1.5} />
        </div>

        <h1 className="text-3xl font-bold text-foreground mb-2">
          Order Confirmed!
        </h1>
        <p className="text-muted-foreground mb-8">
          Thank you for your order. We&apos;ll send you a confirmation email shortly.
        </p>

        <div className="bg-neutral-light rounded-md p-6 mb-8 text-left">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">
            Order Details
          </h2>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Order Number:</span>
              <span className="text-sm font-semibold text-foreground">
                {order?.order_number ?? orderId ?? '—'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Date:</span>
              <span className="text-sm font-semibold text-foreground">
                {order?.created_at
                  ? new Date(order.created_at).toLocaleDateString('en-GB')
                  : new Date().toLocaleDateString('en-GB')}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Payment Method:</span>
              <span className="text-sm font-semibold text-foreground">
                {formatPaymentMethod(order?.payment_method)}
              </span>
            </div>
            <div className="h-px bg-border my-2"></div>
            <div className="flex justify-between">
              <span className="text-sm font-semibold text-foreground">Total:</span>
              <span className="text-lg font-bold text-primary">
                {order ? formatPrice(order.total) : '—'}
              </span>
            </div>
          </div>
        </div>

        <p className="text-sm text-muted-foreground mb-6">
          A confirmation email has been sent to {order?.customer_email ?? 'your email'}.
        </p>

        <div className="flex flex-col gap-3">
          <Button asChild variant="default" size="lg" className="w-full">
            <Link href="/">Continue Shopping</Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="w-full">
            <Link href="/account/orders">View Orders</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}

