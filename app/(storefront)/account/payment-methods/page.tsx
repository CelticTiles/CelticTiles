import { redirect } from "next/navigation"
import { getServerSession } from "@/lib/loaders"
import { CreditCard } from "lucide-react"

export default async function PaymentMethodsPage() {
    const session = await getServerSession()

    if (!session.userId) {
        redirect("/login")
    }

    return (
        <div className="p-12 rounded-[2rem] neu-raised bg-[#E5E9F0] border-none text-center h-full flex flex-col items-center justify-center min-h-[400px]">
            <div className="h-24 w-24 rounded-full bg-primary/10 flex items-center justify-center mb-6">
                <CreditCard className="h-10 w-10 text-primary opacity-60" />
            </div>
            <h1 className="text-3xl font-bold text-slate-800 mb-4">Payment Methods</h1>
            <p className="text-slate-500 font-medium text-lg max-w-md mx-auto">
                Safe and secure payment management is coming soon. You will be able to save your card details securely for faster checkout.
            </p>
        </div>
    )
}
