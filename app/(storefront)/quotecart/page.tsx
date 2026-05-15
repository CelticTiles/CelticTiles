"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { formatPrice } from "@/lib/utils"
import { ArrowLeft, FileText } from "lucide-react"
import { toast } from "sonner"
import { IconSpinner } from "@/components/ui/icon-spinner"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"

interface QuoteItem {
  id: string
  type: "product"
  code: string
  description: string
  quantity: number
  unit_price: number
  discount_percentage: number
  amount: number
  product_id?: string | null
  image_url?: string | null
}

interface QuoteData {
  quoteId: string
  quoteNumber: string
  customerName: string
  customerEmail: string
  customerPhone: string
  items: QuoteItem[]
  subtotal: number
  total: number
  quoteDiscount: number
  quoteDiscountPercentage: number
  deliveryCollection: string
  deliveryAddress?: {
    street: string
    city: string
    state: string
    pincode: string
  }
}

export default function QuoteCartPage() {
  const router = useRouter()
  const [quoteData, setQuoteData] = useState<QuoteData | null>(null)

  useEffect(() => {
    const load = async () => {
      try {
        const stored = sessionStorage.getItem("quoteCart")
        if (!stored) {
          toast.error("No quote data found. Please go back to the quotation.")
          router.push("/admin/quotations")
          return
        }
        const parsed: QuoteData = JSON.parse(stored)
        const productItems = parsed.items.filter(i => i.type === "product")

        // Fetch images for items that are missing image_url
        const missingIds = productItems
          .filter(i => !i.image_url && i.product_id)
          .map(i => i.product_id as string)

        if (missingIds.length > 0) {
          const supabase = getSupabaseBrowserClient()
          const { data } = await supabase
            .from("products")
            .select("id, image")
            .in("id", missingIds)

          if (data) {
            const imageMap = Object.fromEntries(data.map(p => [p.id, p.image]))
            parsed.items = parsed.items.map(item =>
              item.type === "product" && item.product_id && imageMap[item.product_id]
                ? { ...item, image_url: imageMap[item.product_id] }
                : item
            )
          }
        }

        setQuoteData(parsed)
      } catch {
        toast.error("Failed to load quote data.")
        router.push("/admin/quotations")
      }
    }
    load()
  }, [router])

  if (!quoteData) {
    return (
      <main className="bg-background min-h-screen">
        <div className="container mx-auto max-w-[1400px] px-4 py-12">
          <IconSpinner label="Loading quote..." className="min-h-[60vh]" size={64} />
        </div>
      </main>
    )
  }

  const productItems = quoteData.items.filter(i => i.type === "product")
  const itemCount = productItems.reduce((s, i) => s + i.quantity, 0)
  const grossTotal = productItems.reduce((s, i) => s + i.unit_price * i.quantity, 0)
  const itemDiscounts = productItems.reduce((s, i) => s + (i.unit_price * i.quantity - i.amount), 0)

  return (
    <main className="bg-background min-h-screen">
      <div className="container mx-auto max-w-[1400px] px-4 py-12">
        <div className="space-y-8">
          {/* Header — matches cart pattern */}
          <div className="mb-8 border-b border-border pb-4">
            <div className="flex items-center gap-3 mb-2">
              <Link
                href={`/admin/quotations/${quoteData.quoteId}`}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="h-5 w-5" />
              </Link>
              <FileText className="h-5 w-5 text-primary" />
              <h1 className="text-3xl font-serif font-bold text-primary">Quote Cart</h1>
            </div>
            <p className="text-muted-foreground ml-8">
              {quoteData.quoteNumber} — {quoteData.customerName} &nbsp;·&nbsp; {itemCount} item{itemCount !== 1 ? "s" : ""}
            </p>
          </div>

          <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
            {/* Quote Items — matches cart item card style exactly */}
            <div className="space-y-4">
              {productItems.map((item) => (
                <div
                  key={item.id}
                  className="neu-raised rounded-[1.5rem] bg-[#E5E9F0] p-5 flex items-center gap-5"
                >
                  {/* Product image — matches cart image slot exactly */}
                  <div className="relative h-24 w-24 flex-shrink-0 overflow-hidden rounded-xl bg-white">
                    {item.image_url ? (
                      <Image
                        src={item.image_url}
                        alt={item.description}
                        fill
                        className="object-cover"
                        sizes="96px"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-300">
                        <FileText className="h-8 w-8" />
                      </div>
                    )}
                  </div>

                  {/* Item Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-mono text-muted-foreground bg-muted/40 px-2 py-0.5 rounded">
                        {item.code}
                      </span>
                    </div>
                    <h3 className="font-bold text-slate-800 truncate text-sm">{item.description}</h3>
                    <p className="text-sm text-slate-500 mt-1">
                      {formatPrice(item.unit_price)} each
                      {item.discount_percentage > 0 && (
                        <span className="ml-2 text-green-600 font-medium">
                          ({item.discount_percentage}% off)
                        </span>
                      )}
                    </p>

                    {/* Qty display — read-only, matches qty row position */}
                    <div className="flex items-center gap-2 mt-3">
                      <div className="h-9 px-4 rounded-xl neu-inset bg-[#E5E9F0] flex items-center justify-center">
                        <span className="text-sm font-bold text-slate-700 tabular-nums">
                          Qty: {item.quantity}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Line Total */}
                  <div className="text-right flex-shrink-0">
                    {item.discount_percentage > 0 && (
                      <p className="text-xs text-muted-foreground line-through">
                        {formatPrice(item.unit_price * item.quantity)}
                      </p>
                    )}
                    <p className="font-bold text-lg text-slate-800">{formatPrice(item.amount)}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Order Summary sidebar — exact cart sidebar clone */}
            <aside className="neu-raised rounded-[2rem] bg-[#E5E9F0] p-7 h-fit sticky top-24 space-y-5">
              <h2 className="text-lg font-serif font-bold text-slate-800">Order Summary</h2>

              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">Items ({productItems.length})</span>
                  <span className="font-semibold text-slate-700">{formatPrice(grossTotal)}</span>
                </div>

                {itemDiscounts > 0 && (
                  <div className="flex items-center justify-between text-sm text-green-600">
                    <span>Item Discounts</span>
                    <span className="font-semibold">-{formatPrice(itemDiscounts)}</span>
                  </div>
                )}

                {quoteData.quoteDiscount > 0 && (
                  <div className="flex items-center justify-between text-sm text-green-600">
                    <span>Quote Discount ({quoteData.quoteDiscountPercentage}%)</span>
                    <span className="font-semibold">-{formatPrice(quoteData.quoteDiscount)}</span>
                  </div>
                )}

                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">Delivery</span>
                  <span className="font-semibold text-slate-700">{quoteData.deliveryCollection}</span>
                </div>

                <p className="text-xs text-red-500 font-medium">* All prices include VAT</p>
              </div>

              <div className="h-px bg-white/40" />

              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800">Total</span>
                <span className="text-xl font-bold text-slate-800">{formatPrice(quoteData.total)}</span>
              </div>

              <button
                onClick={() => {
                  sessionStorage.setItem("quoteCheckout", JSON.stringify(quoteData))
                  router.push("/checkout?mode=quote")
                }}
                className="flex w-full items-center justify-center rounded-full bg-primary px-6 py-3.5 text-white font-bold hover:bg-primary/90 transition-all hover:scale-[1.02] active:scale-95 shadow-lg"
              >
                Proceed to Checkout
              </button>

              <Link
                href={`/admin/quotations/${quoteData.quoteId}`}
                className="flex w-full items-center justify-center gap-2 rounded-full border-2 border-slate-200 px-6 py-3 text-slate-600 font-bold hover:bg-white/60 transition-all text-sm"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Quote
              </Link>
            </aside>
          </div>
        </div>
      </div>
    </main>
  )
}
