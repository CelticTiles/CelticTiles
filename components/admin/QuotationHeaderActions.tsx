"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Download, Loader2 } from "lucide-react"
import { generateQuotationPDF } from "@/lib/quotation-pdf"
import type { Quotation } from "@/lib/supabase-types"
import { toast } from "sonner"

export function QuotationHeaderActions({ quote }: { quote: Quotation }) {
  const [isGenerating, setIsGenerating] = useState(false)

  const handleDownloadPDF = async () => {
    setIsGenerating(true)
    try {
       const blob = await generateQuotationPDF(quote)
       const url = URL.createObjectURL(blob)
       const a = document.createElement('a')
       a.href = url
       a.download = `${quote.quote_number || 'quote'}.pdf`
       document.body.appendChild(a)
       a.click()
       document.body.removeChild(a)
       URL.revokeObjectURL(url)
    } catch (e: any) {
      toast.error("Failed to generate PDF")
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="flex items-center gap-3">
       <Button variant="outline" onClick={handleDownloadPDF} disabled={isGenerating}>
         {isGenerating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
         Download PDF
       </Button>
    </div>
  )
}
