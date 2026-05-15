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
const FOOTER_H = 52   // height reserved for the 3 boxes + red bar
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

  doc.text(order.customer_name || "", MARGIN + boxW + 8, boxY + 12)
  doc.text(formatPaymentMethod(order.payment_method), MARGIN + boxW + 8, boxY + 19)

  // Meta row
  const metaY = boxY + boxH + 6
  doc.setFont("helvetica", "bold")
  doc.setFontSize(7.5)
  const cols = [MARGIN, 50, 88, 120, 155]
  const labels = ["Inv No.", "Tax Date", "Cust. Order No.", "Sales Rep", "Delivery/Collection"]
  labels.forEach((lbl, i) => doc.text(lbl, cols[i], metaY))

  doc.setFont("helvetica", "normal")
  const delivery = order.payment_method === "offline_cash" || order.payment_method === "card_instore"
    ? "Collection"
    : "Delivery"
  const values = [
    order.order_number,
    format(new Date(order.created_at), "dd/MM/yyyy"),
    order.order_number,
    "WEB",
    delivery,
  ]
  values.forEach((val, i) => doc.text(val, cols[i], metaY + 5))

  return metaY + 10  // Y where the table should start
}

function drawFooter(doc: jsPDF, order: InvoiceOrderData, pageNum: number, totalPages: number) {
  const ph = doc.internal.pageSize.getHeight()
  const pw = doc.internal.pageSize.getWidth()
  const fTop = ph - FOOTER_H - 2

  const bW1 = 74, bW2 = 45, bW3 = 54, gap = 5
  const bH = 34

  doc.setDrawColor(0)
  doc.setLineWidth(0.3)

  // Box 1 — Banking Details
  doc.rect(MARGIN, fTop, bW1, bH)
  doc.setFont("helvetica", "bold")
  doc.setFontSize(8)
  doc.text("Banking Details:", MARGIN + 2, fTop + 5)
  doc.setFont("helvetica", "normal")
  doc.text(["AIB", "Sort Code: 932515", "Account No: 97805024"], MARGIN + 2, fTop + 10)

  // Box 2 — Signature
  doc.rect(MARGIN + bW1 + gap, fTop, bW2, bH)
  doc.setFont("helvetica", "bold")
  doc.text("Signature", MARGIN + bW1 + gap + 5, fTop + 5)

  // Box 3 — Totals (only on last page)
  const box3X = pw - MARGIN - bW3
  doc.rect(box3X, fTop, bW3, bH)

  const subtotal = safeNumber(order.subtotal) || Math.max(0, safeNumber(order.total) - safeNumber(order.tax) - safeNumber(order.shipping_fee))
  const lines: [string, string][] = [
    ["Subtotal", `€${subtotal.toFixed(2)}`],
    ["VAT Total", `€${safeNumber(order.tax).toFixed(2)}`],
  ]
  if (safeNumber(order.discount) > 0) lines.push(["Discount", `-€${safeNumber(order.discount).toFixed(2)}`])
  if (safeNumber(order.shipping_fee) > 0) lines.push(["Shipping", `€${safeNumber(order.shipping_fee).toFixed(2)}`])
  lines.push(["Total", `€${safeNumber(order.total).toFixed(2)}`])

  doc.setFontSize(8)
  let ly = fTop + 5
  for (const [label, value] of lines) {
    doc.setFont("helvetica", label === "Total" ? "bold" : "normal")
    doc.text(label, box3X + 2, ly)
    doc.text(value, pw - MARGIN - 2, ly, { align: "right" })
    ly += 6
  }

  // Payment method line below boxes
  const pmY = fTop + bH + 3
  doc.setFont("helvetica", "normal")
  doc.setFontSize(7)
  doc.setTextColor(0, 0, 0)
  doc.text(
    format(new Date(order.created_at), "dd/MM/yyyy HH:mm:ss"),
    pw / 2, pmY, { align: "center" }
  )
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

  const rows = order.items.map((item) => {
    const qty = safeNumber(item.quantity)
    const unitPrice = safeNumber(item.unit_price)
    const amount = safeNumber(item.subtotal)
    const vat = vatRate > 0 ? amount * (vatRate / 100) : 0
    // Use product_id only if it looks like a real SKU (not a UUID)
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    const code = uuidPattern.test(item.product_id ?? "") ? "-" : (item.product_id || "-")
    return [
      qty.toFixed(2),
      code,
      item.product_name || "-",
      `€${unitPrice.toFixed(2)}`,
      `€${amount.toFixed(2)}`,
      `€${vat.toFixed(2)}`,
    ]
  })

  // Table — stops before footer zone
  autoTable(doc, {
    startY: tableStartY,
    head: [["Total Qty", "Code", "Description", "Unit Price", "Amount", "VAT"]],
    body: rows,
    theme: "plain",
    styles: { fontSize: 8, cellPadding: 1.8, overflow: "linebreak" },
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
      3: { cellWidth: 24, halign: "right" },
      4: { cellWidth: 24, halign: "right" },
      5: { cellWidth: 24, halign: "right" },
    },
    // Stop the table before the footer zone on every page
    // margin.top = header height so continuation pages start below redrawn header
    margin: { top: tableStartY, bottom: FOOTER_H + 10, left: MARGIN, right: MARGIN },
    didDrawPage: (data) => {
      if (data.pageNumber > 1) {
        const newStartY = drawHeader(doc, logoDataUri, order)
        // Push the cursor down so table rows don't overlap header
        ;(data.cursor as any).y = newStartY
      }
    },
  })

  // Count total pages and draw footer on every page
  const totalPages = (doc as any).internal.getNumberOfPages()
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p)
    drawFooter(doc, order, p, totalPages)
  }

  const arrayBuffer = doc.output("arraybuffer")
  return Buffer.from(arrayBuffer)
}
