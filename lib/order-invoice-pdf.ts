import { jsPDF } from "jspdf"
import autoTable from "jspdf-autotable"
import { format } from "date-fns"
import { readFile } from "node:fs/promises"
import path from "node:path"

interface InvoiceItem {
  product_id: string
  product_name: string
  quantity: number
  unit_price: number
  subtotal: number
  vat_rate?: number
  type?: string
  label?: string
  sku?: string
}

interface InvoiceAddress {
  street?: string
  city?: string
  state?: string
  pincode?: string
  country?: string
}

export interface InvoiceOrderData {
  order_number: string
  created_at: string
  customer_name: string
  payment_method: string | null
  subtotal: number
  tax: number
  discount: number
  shipping_fee: number
  total: number
  items: InvoiceItem[]
  delivery_address: InvoiceAddress | null
  source?: string
  paid_amount?: number
  sales_rep?: string
  acc_ref?: string
}

async function loadLogoDataUri(): Promise<string | null> {
  try {
    const logoPath = path.join(process.cwd(), "public", "images", "celticlogo.png")
    const file = await readFile(logoPath)
    return `data:image/png;base64,${file.toString("base64")}`
  } catch {
    return null
  }
}

function safeNumber(value: unknown): number {
  const num = typeof value === "number" ? value : Number(value)
  return Number.isFinite(num) ? num : 0
}

export function getSixDigitInvoiceNumber(orderNumber: string | null | undefined): string {
  if (!orderNumber) return "-"
  const mockMatch = orderNumber.match(/^ORD-(\d+)$/)
  if (mockMatch) {
    return `INV-${mockMatch[1].padStart(6, "0")}`
  }
  let hash = 0
  for (let i = 0; i < orderNumber.length; i++) {
    hash = (hash << 5) - hash + orderNumber.charCodeAt(i)
    hash |= 0
  }
  const code = Math.abs(hash) % 900000 + 100000
  return `INV-${code}`
}

function formatPaymentMethod(method: string | null): string {
  if (!method) return "Card Payment"
  if (method === "offline_cash") return "Cash on Collection"
  if (method === "card_instore") return "Card - In Store"
  if (method === "bank_transfer") return "Bank Transfer"
  return "Card Payment"
}

// Fixed heights
const PAGE_H = 297
const PAGE_W = 210
const MARGIN = 14
const FOOTER_H = 60   // height reserved for the 3 boxes + red bar
const FOOTER_TOP = PAGE_H - FOOTER_H - 6  // Y where footer starts

function drawHeader(doc: jsPDF, logoDataUri: string | null, order: InvoiceOrderData) {
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
  doc.text("Invoice", PAGE_W - MARGIN, 20, { align: "right" })

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
  doc.text("Name/Address", MARGIN + 2, boxY + 5)
  doc.text("Ship To", MARGIN + boxW + 8, boxY + 5)

  doc.setLineWidth(0.2)
  doc.line(MARGIN, boxY + 7, MARGIN + boxW, boxY + 7)
  doc.line(MARGIN + boxW + 6, boxY + 7, MARGIN + boxW * 2 + 6, boxY + 7)

  doc.setFont("helvetica", "normal")
  doc.setFontSize(8)
  const addr = order.delivery_address
  const addrLines = [
    order.customer_name,
    addr?.street || "",
    [addr?.city, addr?.state].filter(Boolean).join(", "),
    [addr?.pincode, addr?.country].filter(Boolean).join(" "),
  ].filter(Boolean)
  doc.text(addrLines, MARGIN + 2, boxY + 12)

  // Ship To box also displays the delivery/shipping address details
  doc.text(addrLines, MARGIN + boxW + 8, boxY + 12)

  // Meta row — 8 columns matching invoice reference
  const metaY = boxY + boxH + 6
  doc.setFont("helvetica", "bold")
  doc.setFontSize(6.8)
  const cols = [MARGIN, 36, 57, 80, 101, 127, 150, 176]
  const labels = ["Inv No.", "Acc Ref", "Tax Date", "Del Date", "Cust. Order No.", "Sales Rep", "Delivery/Collection", "Collected By"]
  labels.forEach((lbl, i) => doc.text(lbl, cols[i], metaY))

  doc.setFont("helvetica", "normal")
  const delivery = order.payment_method === "offline_cash" || order.payment_method === "card_instore"
    ? "Collection"
    : "Delivery"
  const values = [
    getSixDigitInvoiceNumber(order.order_number),
    order.acc_ref || "-",
    format(new Date(order.created_at), "dd/MM/yyyy"),
    "",
    "",
    order.sales_rep || "WEB",
    delivery,
    "",
  ]
  values.forEach((val, i) => doc.text(val, cols[i], metaY + 5))

  return metaY + 10  // Y where the table should start
}

function drawFooter(doc: jsPDF, order: InvoiceOrderData, pageNum: number, totalPages: number) {
  const ph = doc.internal.pageSize.getHeight()
  const pw = doc.internal.pageSize.getWidth()
  const fTop = ph - FOOTER_H - 2

  const isLastPage = pageNum === totalPages

  if (isLastPage) {
    const bW1 = 70, bW2 = 42, bW3 = 60, gap = 5
    const bH = 44

    doc.setDrawColor(0)
    doc.setLineWidth(0.3)

    // Box 1 — Banking Details
    doc.rect(MARGIN, fTop, bW1, bH)
    doc.setFont("helvetica", "bold")
    doc.setFontSize(8)
    doc.text("Banking Details:", MARGIN + 2, fTop + 5)
    doc.setFont("helvetica", "normal")
    const bankLines = ["AIB", "Sort Code: 932515", "Account No: 97805024"]
    if (order.acc_ref) bankLines.push(`Acc Ref: ${order.acc_ref}`)
    doc.text(bankLines, MARGIN + 2, fTop + 10)

    // Box 2 — Signature
    doc.rect(MARGIN + bW1 + gap, fTop, bW2, bH)
    doc.setFont("helvetica", "bold")
    doc.text("Signature", MARGIN + bW1 + gap + 5, fTop + 5)

    // Box 3 — Totals
    const box3X = pw - MARGIN - bW3
    doc.rect(box3X, fTop, bW3, bH)

    let itemsTotal = 0
    let itemsVat = 0
    const oVatRate =
      safeNumber(order.total) > 0 && safeNumber(order.tax) > 0
        ? Math.round((safeNumber(order.tax) / Math.max(safeNumber(order.total) - safeNumber(order.tax), 1)) * 10000) / 100
        : 0

    order.items.forEach((item) => {
      if ((item as any).type === "section_header") return
      const qty = safeNumber(item.quantity)
      const unitPrice = safeNumber(item.unit_price)
      const amount = qty * unitPrice
      const itemVatRate = item.vat_rate !== undefined ? safeNumber(item.vat_rate) : (oVatRate > 0 ? oVatRate : 23)
      const vat = amount * (itemVatRate / (100 + itemVatRate))
      itemsTotal += amount
      itemsVat += vat
    })

    const total = itemsTotal + safeNumber(order.shipping_fee) - safeNumber(order.discount)
    const vatAmount = itemsVat
    const subtotal = itemsTotal - itemsVat

    const lines: [string, string][] = []
    lines.push(["Subtotal", `€ ${subtotal.toLocaleString("en-IE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`])
    lines.push(["VAT Total", `€ ${vatAmount.toLocaleString("en-IE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`])
    if (safeNumber(order.discount) > 0) {
      lines.push(["Discount", `-€ ${safeNumber(order.discount).toLocaleString("en-IE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`])
    }
    if (safeNumber(order.shipping_fee) > 0) {
      lines.push(["Shipping", `€ ${safeNumber(order.shipping_fee).toLocaleString("en-IE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`])
    }
    lines.push(["Total", `€ ${total.toLocaleString("en-IE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`])

    let ly = fTop + 6
    for (const [label, value] of lines) {
      const isBold = ["Subtotal", "VAT Total", "Total"].includes(label)
      doc.setFont("helvetica", isBold ? "bold" : "normal")
      doc.setFontSize(isBold ? 11 : 9)
      doc.text(label, box3X + 3, ly)
      doc.text(value, pw - MARGIN - 3, ly, { align: "right" })
      ly += 6.5
    }

    // Payment method section — divider line + method label + value
    const divY = ly + 0.5
    doc.setLineWidth(0.2)
    doc.line(box3X + 1, divY, pw - MARGIN - 1, divY)
    ly = divY + 5.5
    
    doc.setFont("helvetica", "bold")
    doc.setFontSize(8)
    doc.text("Payment", box3X + 3, ly)
    doc.text("Method", box3X + 3, ly + 4.5)

    const paymentText = formatPaymentMethod(order.payment_method).toUpperCase()
    const paidAmount = safeNumber(order.paid_amount)
    const totalAmt = safeNumber(order.total)
    
    doc.setFont("helvetica", "bold")
    doc.setFontSize(8)
    if (paidAmount > 0 && paidAmount < totalAmt) {
      doc.text(`CF ${paidAmount.toFixed(2)}CF`, pw - MARGIN - 3, ly, { align: "right" })
      doc.text(paymentText, pw - MARGIN - 3, ly + 4.5, { align: "right" })
    } else {
      doc.text(paymentText, pw - MARGIN - 3, ly + 2, { align: "right" })
    }
  }

  // Payment method/time line below boxes
  const pmY = fTop + 44 + 4
  doc.setFont("helvetica", "normal")
  doc.setFontSize(9)
  doc.setTextColor(0, 0, 0)
  
  // Date under signature box
  doc.text(
    format(new Date(order.created_at), "dd/MM/yyyy HH:mm:ss"),
    pw / 2, pmY, { align: "center" }
  )

  // Page 1 of 1 aligned right
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

export async function generateOrderInvoicePdfBuffer(order: InvoiceOrderData): Promise<Buffer> {
  const doc = new jsPDF({ unit: "mm", format: "a4" })
  const logoDataUri = await loadLogoDataUri()

  doc.setFont("helvetica", "normal")

  // --- Page 1 header ---
  const tableStartY = drawHeader(doc, logoDataUri, order)

  const vatRate =
    safeNumber(order.total) > 0 && safeNumber(order.tax) > 0
      ? Math.round((safeNumber(order.tax) / Math.max(safeNumber(order.total) - safeNumber(order.tax), 1)) * 10000) / 100
      : 0

  const validItems: any[] = [];
  for (let i = 0; i < order.items.length; i++) {
    const item = order.items[i];
    if ((item as any).type === "section_header") {
      let hasProducts = false;
      for (let j = i + 1; j < order.items.length; j++) {
        if (order.items[j].product_id || (order.items[j] as any).type === "product") {
          hasProducts = true;
          break;
        }
        if ((order.items[j] as any).type === "section_header") {
          break;
        }
      }
      if (hasProducts) {
        validItems.push(item);
      }
    } else {
      validItems.push(item);
    }
  }

  const rows = validItems.map((item) => {
    if (item.type === "section_header") {
      return [
        {
          content: item.label || item.product_name || "",
          colSpan: 6,
          styles: {
            fontStyle: "bold" as const,
            fillColor: [255, 255, 255] as [number, number, number],
            textColor: [0, 0, 0] as [number, number, number],
          },
        },
      ];
    }

    const qty = safeNumber(item.quantity)
    let itemVatRate = item.vat_rate !== undefined ? safeNumber(item.vat_rate) : (vatRate > 0 ? vatRate : 23)

    const unitPrice = safeNumber(item.unit_price)
    const amount = qty * unitPrice
    const vat = amount * (itemVatRate / (100 + itemVatRate))

    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    const code = item.sku || (uuidPattern.test(item.product_id ?? "") ? "-" : (item.product_id || "-"))
    return [
      qty.toFixed(2),
      code,
      item.product_name || "-",
      `€ ${unitPrice.toFixed(2)}`,
      `€ ${amount.toFixed(2)}`,
      `€ ${vat.toFixed(2)}`,
    ]
  })

  // Table — stops before footer zone
  autoTable(doc, {
    startY: tableStartY,
    head: [["Total Qty", "Code", "Description", "Unit Price", "Amount", "VAT"]],
    body: rows,
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
        data.cell.styles.halign = "center";
      }
    },
    // Stop the table before the footer zone on every page (using a smaller bottom margin of 22 to fill preceding pages)
    // margin.top = header height so continuation pages start below redrawn header
    margin: { top: tableStartY, bottom: 22, left: MARGIN, right: MARGIN },
    didDrawPage: (data) => {
      if (data.pageNumber > 1) {
        const newStartY = drawHeader(doc, logoDataUri, order)
        // Push the cursor down so table rows don't overlap header
        ;(data.cursor as any).y = newStartY
      }
    },
  })

  const finalY = (doc as any).lastAutoTable.finalY || 0
  const fTop = PAGE_H - FOOTER_H - 2
  if (finalY > fTop) {
    doc.addPage()
  }

  // Count total pages and draw footer on every page
  const totalPages = (doc as any).internal.getNumberOfPages()
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p)
    drawFooter(doc, order, p, totalPages)
  }

  const arrayBuffer = doc.output("arraybuffer")
  return Buffer.from(arrayBuffer)
}
