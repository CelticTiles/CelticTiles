import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import type { Quotation } from "./supabase-types"
import { format } from "date-fns"

function safeNumber(value: unknown): number {
  const num = typeof value === "number" ? value : Number(value)
  return Number.isFinite(num) ? num : 0
}

// Utility to load image to base64 on client
async function fetchImageAsBase64(url: string): Promise<string | null> {
  try {
    const response = await fetch(url)
    const blob = await response.blob()
    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result as string)
      reader.onerror = () => resolve(null)
      reader.readAsDataURL(blob)
    })
  } catch {
    return null
  }
}

// Fixed heights (matching invoice)
const PAGE_H = 297
const PAGE_W = 210
const MARGIN = 14
const FOOTER_H = 60
const FOOTER_TOP = PAGE_H - FOOTER_H - 6

function drawHeader(doc: jsPDF, logoDataUri: string | null, quote: Quotation) {
  // Logo + company info
  if (logoDataUri) {
    doc.addImage(logoDataUri, "PNG", MARGIN, 10, 38, 16)
  } else {
    doc.setFont("helvetica", "bold")
    doc.setFontSize(14)
    doc.text("CELTIC TILES", MARGIN, 18)
  }

  doc.setFont("helvetica", "normal")
  doc.setFontSize(8)
  doc.text("Celtic Tiles Ltd", 54, 14)
  doc.text("Unit D3 Finches industrial Park", 54, 18)
  doc.text("Longmile Road Dublin12 D12FP74", 54, 22)

  doc.setFont("helvetica", "bold")
  doc.setFontSize(22)
  doc.text("Quotation", PAGE_W - MARGIN, 20, { align: "right" })

  // Name/Address + Ship To boxes
  const boxY = 32
  const boxH = 34
  const boxW = (PAGE_W - MARGIN * 2 - 6) / 2

  doc.setDrawColor(0)
  doc.setLineWidth(0.3)
  doc.rect(MARGIN, boxY, boxW, boxH)
  doc.rect(MARGIN + boxW + 6, boxY, boxW, boxH)

  doc.setFont("helvetica", "bold")
  doc.setFontSize(9)
  doc.text("Quote To", MARGIN + 2, boxY + 5)
  doc.text("Ship To", MARGIN + boxW + 8, boxY + 5)

  doc.setLineWidth(0.2)
  doc.line(MARGIN, boxY + 7, MARGIN + boxW, boxY + 7)
  doc.line(MARGIN + boxW + 6, boxY + 7, MARGIN + boxW * 2 + 6, boxY + 7)

  doc.setFont("helvetica", "normal")
  doc.setFontSize(8)
  const custLines = [
    quote.customer_name,
    quote.customer_email || "",
    quote.customer_phone || "",
  ].filter(Boolean)
  doc.text(custLines, MARGIN + 2, boxY + 12)

  // Ship To box
  const addrLines = [
    quote.customer_name,
    quote.delivery_address_line1 || "",
    quote.delivery_address_line2 || "",
    [quote.delivery_city, quote.delivery_postcode].filter(Boolean).join(" "),
  ].filter(Boolean)
  if (quote.delivery_collection === "Delivery") {
    doc.text(addrLines, MARGIN + boxW + 8, boxY + 12)
  } else {
    doc.text("Collection", MARGIN + boxW + 8, boxY + 12)
  }

  // Meta row — 8 columns matching invoice reference
  const metaY = boxY + boxH + 6
  doc.setFont("helvetica", "bold")
  doc.setFontSize(6.8)
  const cols = [MARGIN, 36, 57, 80, 101, 127, 150, 176]
  const labels = ["QTE No.", "Quote Type", "QTE Date", "Valid Until", "Cust. Order No.", "Sales Rep", "Delivery/Collection", ""]
  labels.forEach((lbl, i) => doc.text(lbl, cols[i], metaY))

  doc.setFont("helvetica", "normal")
  const values = [
    quote.quote_number ? (quote.quote_number.startsWith("QTE-") ? quote.quote_number : `QTE-${quote.quote_number}`) : "-",
    quote.quote_type || "-",
    quote.quote_date ? format(new Date(quote.quote_date), "dd/MM/yyyy") : "-",
    quote.valid_until ? format(new Date(quote.valid_until), "dd/MM/yyyy") : "-",
    quote.customer_order_no || "-",
    quote.sales_rep_name || "System Default Rep",
    quote.delivery_collection || "-",
    "",
  ]
  values.forEach((val, i) => doc.text(val, cols[i], metaY + 5))

  return metaY + 10
}

function drawFooter(doc: jsPDF, quote: Quotation, pageNum: number, totalPages: number) {
  const ph = doc.internal.pageSize.getHeight()
  const pw = doc.internal.pageSize.getWidth()
  const fTop = ph - FOOTER_H - 2

  const isLastPage = pageNum === totalPages

  if (isLastPage) {
    const bW1 = 70, bW2 = 42, bW3 = 60, gap = 5
    const bH = 44

    doc.setDrawColor(0)
    doc.setLineWidth(0.3)

    // Box 1 — Instructions & Notes
    doc.rect(MARGIN, fTop, bW1, bH)
    doc.setFont("helvetica", "bold")
    doc.setFontSize(8)
    doc.text("Instruction / Notes:", MARGIN + 2, fTop + 5)
    doc.setFont("helvetica", "normal")
    const notesLines = [
      quote.instructions || "",
      "Prices are subject to change due to supplier cost increases and are valid for 30 days."
    ].filter(Boolean)
    doc.text(doc.splitTextToSize(notesLines.join("\\n\\n"), bW1 - 4), MARGIN + 2, fTop + 10)

    // Box 2 — Signature
    doc.rect(MARGIN + bW1 + gap, fTop, bW2, bH)
    doc.setFont("helvetica", "bold")
    doc.text("Signature", MARGIN + bW1 + gap + 5, fTop + 5)

    // Box 3 — Totals
    const box3X = pw - MARGIN - bW3
    doc.rect(box3X, fTop, bW3, bH)

    let itemsTotal = 0
    let itemsVat = 0
    const sampleVatRate =
      quote.items.find(
        (item): item is import("./supabase-types").QuotationProductItem =>
          item.type === "product" &&
          typeof (item as any).vat_rate === "number" &&
          (item as any).vat_rate > 0,
      )?.vat_rate || 23

    quote.items.forEach((item) => {
      if (item.type === "section_header") return
      const qty = safeNumber(item.quantity)
      const unitPrice = safeNumber(item.unit_price)
      const amount = qty * unitPrice
      const itemVatRate = item.vat_rate !== undefined ? safeNumber(item.vat_rate) : sampleVatRate
      const vat = amount * (itemVatRate / (100 + itemVatRate))
      itemsTotal += amount
      itemsVat += vat
    })

    const vatAmount = itemsVat
    const subtotal = itemsTotal - itemsVat
    const baseAmountBeforeDiscount = subtotal + vatAmount

    let quoteDiscount = 0
    if (quote.discount_enabled && quote.discount_percentage) {
      quoteDiscount = itemsTotal * (quote.discount_percentage / 100)
    }

    const lines: [string, string][] = []
    lines.push(["Subtotal", `€ ${subtotal.toLocaleString("en-IE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`])
    lines.push(["VAT Total", `€ ${vatAmount.toLocaleString("en-IE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`])
    if (quoteDiscount > 0) {
      lines.push(["Quote Discount", `-€ ${quoteDiscount.toLocaleString("en-IE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`])
    }
    lines.push(["Total", `€ ${safeNumber(quote.total).toLocaleString("en-IE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`])

    let ly = fTop + 6
    for (const [label, value] of lines) {
      const isBold = ["Subtotal", "VAT Total", "Total"].includes(label)
      doc.setFont("helvetica", isBold ? "bold" : "normal")
      doc.setFontSize(isBold ? 11 : 9)
      doc.text(label, box3X + 3, ly)
      doc.text(value, pw - MARGIN - 3, ly, { align: "right" })
      ly += 6.5
    }
  }

  // Time line below boxes
  const pmY = fTop + 44 + 4
  doc.setFont("helvetica", "normal")
  doc.setFontSize(9)
  doc.setTextColor(0, 0, 0)
  
  doc.text(
    format(new Date(quote.created_at), "dd/MM/yyyy HH:mm:ss"),
    pw / 2, pmY, { align: "center" }
  )

  doc.setFont("helvetica", "bold")
  doc.text(`Page ${pageNum} of ${totalPages}`, pw - MARGIN, pmY, { align: "right" })

  // Red footer bar
  const barY = ph - 10
  doc.setFillColor(136, 17, 33)
  doc.rect(MARGIN, barY, pw - MARGIN * 2, 8, "F")
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(6.5)
  doc.text(
    "Phone:+35314090558  Cell:+353870007777  Email:info@celtictiles.ie  Website:https://www.celtictiles.ie",
    MARGIN + 2, barY + 3.5
  )
  doc.text("VAT Reg. No.:4047335JH  Company Reg No.:725840", MARGIN + 2, barY + 6.5)
  doc.setTextColor(0, 0, 0)
}

export async function generateQuotationPDF(quote: Quotation): Promise<Blob> {
  const doc = new jsPDF({ unit: "mm", format: "a4" })
  const logoUrl = typeof window !== "undefined" ? `${window.location.origin}/images/celticlogo.png` : null
  const logoDataUri = logoUrl ? await fetchImageAsBase64(logoUrl) : null

  doc.setFont("helvetica", "normal")

  const tableStartY = drawHeader(doc, logoDataUri, quote)

  const sampleVatRate =
    quote.items.find(
      (item): item is import("./supabase-types").QuotationProductItem =>
        item.type === "product" &&
        typeof (item as any).vat_rate === "number" &&
        (item as any).vat_rate > 0,
    )?.vat_rate || 23

  const validItems: any[] = []
  for (let i = 0; i < quote.items.length; i++) {
    const item = quote.items[i]
    if (item.type === "section_header") {
      let hasProducts = false
      for (let j = i + 1; j < quote.items.length; j++) {
        if (quote.items[j].type === "product") {
          hasProducts = true
          break
        }
        if (quote.items[j].type === "section_header") {
          break
        }
      }
      if (hasProducts) {
        validItems.push(item)
      }
    } else {
      validItems.push(item)
    }
  }

  const rows = validItems.map((item) => {
    if (item.type === "section_header") {
      return [
        {
          content: item.label || "",
          colSpan: 6,
          styles: {
            fontStyle: "bold" as const,
            fillColor: [255, 255, 255] as [number, number, number],
            textColor: [0, 0, 0] as [number, number, number],
          },
        },
      ]
    }

    const qty = safeNumber(item.quantity)
    let itemVatRate = item.vat_rate !== undefined ? safeNumber(item.vat_rate) : sampleVatRate

    const unitPrice = safeNumber(item.unit_price)
    const amount = qty * unitPrice
    const vat = amount * (itemVatRate / (100 + itemVatRate))

    return [
      qty.toFixed(2),
      item.code || "-",
      item.description || "-",
      `€ ${unitPrice.toFixed(2)}`,
      `€ ${amount.toFixed(2)}`,
      `€ ${vat.toFixed(2)}`,
    ]
  })

  autoTable(doc, {
    startY: tableStartY,
    head: [["Total Qty", "Code", "Description", "Unit Price", "Amount", "VAT"]],
    body: rows as any,
    theme: "plain",
    styles: { fontSize: 8, cellPadding: 1.2, overflow: "linebreak" },
    headStyles: {
      textColor: [0, 0, 0],
      fillColor: [255, 255, 255],
      fontStyle: "bold",
      lineColor: [0, 0, 0],
      lineWidth: { top: 0.4, bottom: 0.4, left: 0, right: 0 },
    },
    columnStyles: {
      0: { cellWidth: 16 },
      1: { cellWidth: 20 },
      2: { cellWidth: 74 },
      3: { cellWidth: 24, halign: "center" },
      4: { cellWidth: 24, halign: "center" },
      5: { cellWidth: 24, halign: "center" },
    },
    didParseCell: (data) => {
      if (data.column.index === 3 || data.column.index === 4 || data.column.index === 5) {
        data.cell.styles.halign = "center"
      }
    },
    margin: { top: tableStartY, bottom: 22, left: MARGIN, right: MARGIN },
    didDrawPage: (data) => {
      if (data.pageNumber > 1) {
        const newStartY = drawHeader(doc, logoDataUri, quote)
        ;(data.cursor as any).y = newStartY
      }
    },
  })

  const finalY = (doc as any).lastAutoTable.finalY || 0
  const fTop = PAGE_H - FOOTER_H - 2
  if (finalY > fTop) {
    doc.addPage()
  }

  const totalPages = (doc as any).internal.getNumberOfPages()
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p)
    drawFooter(doc, quote, p, totalPages)
  }

  return doc.output("blob")
}
