import { XCircle } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

type Props = {
  searchParams: Promise<{ orderId?: string; reason?: string }>
}

export default async function OrderFailedPage({ searchParams }: Props) {
  const params = await searchParams
  const orderId = params.orderId
  const reason = params.reason || "Payment processing failed"

  return (
    <div className="min-h-screen bg-neutral-light flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-card-hover p-8 text-center">
        <div className="mb-6 flex justify-center">
          <XCircle className="h-24 w-24 text-destructive" strokeWidth={1.5} />
        </div>

        <h1 className="text-3xl font-bold text-foreground mb-2">
          Payment Failed
        </h1>
        <p className="text-muted-foreground mb-8">{reason}</p>

        <div className="bg-red-50 border border-red-200 rounded-md p-6 mb-8 text-left">
          <h2 className="text-sm font-semibold text-red-800 uppercase tracking-wide mb-3">
            What happened?
          </h2>
          <ul className="text-sm text-red-700 space-y-2 list-disc list-inside">
            <li>Your payment could not be processed</li>
            <li>No charges were made to your account</li>
            <li>Your order was not placed</li>
          </ul>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mb-8 text-left">
          <h3 className="text-sm font-semibold text-blue-800 mb-2">
            Common reasons:
          </h3>
          <ul className="text-xs text-blue-700 space-y-1 list-disc list-inside">
            <li>Insufficient funds</li>
            <li>Incorrect card details</li>
            <li>Card expired or blocked</li>
            <li>Network connection issue</li>
          </ul>
        </div>

        <div className="flex flex-col gap-3">
          <Button asChild variant="default" size="lg" className="w-full">
            <Link href="/checkout">Try Again</Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="w-full">
            <Link href="/cart">Back to Cart</Link>
          </Button>
          <Button asChild variant="ghost" size="lg" className="w-full">
            <Link href="/">Continue Shopping</Link>
          </Button>
        </div>

        {orderId && (
          <p className="text-xs text-muted-foreground mt-6">Reference: {orderId}</p>
        )}
      </div>
    </div>
  )
}
