import { redirect } from "next/navigation"

type Props = {
  searchParams: Promise<{ orderId?: string }>
}

export default async function PaymentSuccessPage({ searchParams }: Props) {
  const params = await searchParams
  const orderId = params.orderId

  if (orderId) {
    redirect(`/order/success?orderId=${encodeURIComponent(orderId)}`)
  }

  redirect("/order/success")
}
