import { redirect } from "next/navigation"
import { getServerSession } from "@/lib/loaders"
import { CreditCard } from "lucide-react"

export default async function PaymentMethodsPage() {
    const session = await getServerSession()

    if (!session.userId) {
        redirect("/login")
    }

    return (
        <div className="bg-white p-12 rounded-lg shadow-sm border border-tm-border text-center">
            <CreditCard className="h-16 w-16 mx-auto mb-4 text-tm-text-muted opacity-20" />
            <h1 className="text-3xl font-bold text-tm-text mb-4">Payment Methods</h1>
            <p className="text-tm-text-muted text-lg">
                Safe and secure payment management is coming soon. You will be able to save your card details for faster checkout.
            </p>
        </div>
    )
}
