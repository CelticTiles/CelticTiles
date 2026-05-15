import { Suspense } from "react"
import Link from "next/link"
import { Plus, FileText } from "lucide-react"
import { Button } from "@/components/ui/button"
import { getQuotations } from "@/lib/quotation-actions"
import { QuotationsTable } from "@/components/admin/QuotationsTable"
export const revalidate = 0

export const metadata = {
  title: "Quotations | Admin",
  description: "Manage customer quotations",
}

export default async function QuotationsPage() {
  const quotations = await getQuotations()

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <FileText className="w-8 h-8 text-primary" />
            Quotations
          </h1>
          <p className="text-slate-500 mt-1 flex items-center">
            Create and manage customer quotes.
          </p>
        </div>
        <Button asChild className="neu-raised shrink-0 group relative text-white hover:text-white border-transparent">
          <Link href="/admin/quotations/new">
            <span className="relative z-10 flex items-center">
              <Plus className="w-5 h-5 mr-2 transition-transform group-hover:rotate-90" />
              New Quotation
            </span>
          </Link>
        </Button>
      </div>

      <Suspense fallback={<div className="h-64 flex items-center justify-center border rounded-lg animate-pulse bg-gray-50">Loading quotations...</div>}>
         <QuotationsTable initialQuotations={quotations} />
      </Suspense>
    </div>
  )
}

