import { QuotationBuilder } from "@/components/admin/QuotationBuilder"
import { getStoreVatRate } from "@/lib/quotation-actions"
import { getServerSession } from "@/lib/loaders"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
export const revalidate = 0

export const metadata = {
  title: "New Quotation | Admin",
  description: "Create a new quotation",
}

export default async function NewQuotationPage() {
  const [vatRate, session] = await Promise.all([
    getStoreVatRate(),
    getServerSession()
  ])
  
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/quotations" className="p-2 hover:bg-gray-100 rounded-full transition-colors group">
          <ArrowLeft className="w-5 h-5 text-gray-500 group-hover:text-gray-900" />
        </Link>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Create Quotation</h1>
      </div>
      
      <QuotationBuilder vatRate={vatRate} currentUserName={session.userName || ""} />
    </div>
  )
}
