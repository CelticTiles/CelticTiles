import { NextResponse } from "next/server"
import { getServerSession } from "@/lib/loaders"
import { createWorker, Worker } from "tesseract.js"
// Remove top-level pdf-parse import as it causes crashes in Next.js server runtime
// import pdf from "pdf-parse"

export const runtime = "nodejs"

// ── Singleton OCR worker ───────────────────────────────────────────────────────
let _worker: Worker | null = null
let _workerInitialising = false

async function getWorker(): Promise<Worker> {
  if (_worker) return _worker
  if (_workerInitialising) {
    await new Promise<void>((resolve) => {
      const interval = setInterval(() => {
        if (!_workerInitialising) { clearInterval(interval); resolve() }
      }, 50)
    })
    return _worker!
  }
  _workerInitialising = true
  try {
    _worker = await createWorker("eng")
  } finally {
    _workerInitialising = false
  }
  return _worker!
}

// ── OCR text normalisation ─────────────────────────────────────────────────────
const HEADER_WORDS = [
  "pallets", "boxes", "cajas", "pieces", "piezas", "blisters",
  "formato", "size", "descripcion", "description", "codigo", "code",
  "precio", "price", "importe", "amount", "total", "payment", "dto",
  "m2", "qty", "quantity", "ref", "s/ref", "visit", "alb",
]

const BLACKLIST_WORDS = [
  "subtotal", "total", "vat amount", "page", "signature", "instruction",
  "phone", "email", "website", "reg no", "company reg", "please note",
  "unit d3", "longmile road", "dublin12", "celtic tiles", "quote to",
  "sales rep", "customer order", "delivery/collection", "qte no.", "qte date",
  "material quote"
]

function isHeaderOrNoiseLine(line: string): boolean {
  const lower = line.toLowerCase()
  const words = lower.split(/\s+/).filter(Boolean)
  
  if (words.length === 0) return true
  
  // 1. Blacklist check
  if (BLACKLIST_WORDS.some(b => lower.includes(b))) return true
  
  // 2. Header word density check
  const headerWordCount = words.filter(w => HEADER_WORDS.some(h => w.includes(h))).length
  if (headerWordCount / words.length > 0.7) return true
  
  // 3. Date / Alb pattern check
  if (/\d{2,}\/\d{2,}\/\d{4}/.test(line) || /alb\./i.test(line)) return true
  
  // 4. Pure numeric noise
  if (/^[\d\s.,€$-]+$/.test(line)) return true
  
  // 5. Product line pattern (STRICT)
  // [Qty] [Code] [Description...]
  const isProductPattern = /^\d+([.,]\d+)?\s+[A-Z0-9/.-]+\s+.+/.test(line.trim())
  
  // If it's a product pattern, it's NOT noise
  if (isProductPattern) return false

  // Otherwise, if it has very few words, it's likely noise
  if (words.length < 2) return true

  return false
}

// Extracts the product description from a full table row.
// Delivery-note rows have leading numeric columns (pallets, boxes, pieces, m2,
// size) before the name and trailing codes/prices after. We find the longest
// contiguous run of tokens that contains real alphabetic words.
function extractDescriptionSegment(line: string): string {
  const tokens = line.split(/\s+/).filter(Boolean)

  let bestStart = -1
  let bestLen = 0
  let cur = -1
  let curLen = 0

  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i]
    const hasLetters = /[a-zA-Zà-ɏ]/.test(t)
    const isPureNumeric = /^[\d.,]+$/.test(t)
    // Short all-uppercase tokens are likely column codes (ST, CI, E) — skip them
    const isShortCode = t.length <= 2 && /^[A-Z]+$/.test(t)

    if (hasLetters && !isPureNumeric && !isShortCode) {
      if (cur === -1) { cur = i; curLen = 1 } else curLen++
    } else {
      if (curLen > bestLen) { bestStart = cur; bestLen = curLen }
      cur = -1; curLen = 0
    }
  }
  if (curLen > bestLen) { bestStart = cur; bestLen = curLen }

  if (bestStart === -1 || bestLen === 0) return line
  return tokens.slice(bestStart, bestStart + bestLen).join(" ")
}

function normaliseOcrText(raw: string): string {
  return raw
    .split("\n")
    .map((line) =>
      line
        .replace(/\|/g, "1")
        .replace(/[ \t]+/g, " ")
        .replace(/[^a-zA-Z0-9 '"\/.:(),xXáéíóúñüÁÉÍÓÚÑÜ-]/g, "")
        .trim()
    )
    .filter((line) => !isHeaderOrNoiseLine(line))
    .join("\n")
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession()
    if (!session || (session.userRole !== "admin" && session.userRole !== "sales" && session.userRole !== "inventory")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const formData = await req.formData()
    const file = formData.get("image") as File | null

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    let rawText = ""
    let confidence = 0

    if (file.type === "application/pdf") {
      try {
        const { PdfReader } = await import("pdfreader")
        const rows: { [y: number]: any[] } = {}
        
        const textPromise = new Promise<string>((resolve, reject) => {
          new PdfReader().parseBuffer(buffer, (err, item) => {
            if (err) reject(err)
            else if (!item) {
              // End of file — reconstruct text
              const fullText = Object.keys(rows)
                .sort((a, b) => Number(a) - Number(b))
                .map((y) => rows[Number(y)].sort((a, b) => a.x - b.x).map(i => i.text).join(" "))
                .join("\n")
              resolve(fullText)
            } else if (item.text) {
              const y = Math.round(item.y * 100) // Snap to row
              if (!rows[y]) rows[y] = []
              rows[y].push({ x: item.x, text: item.text })
            }
          })
        })

        rawText = await textPromise
        confidence = 100
      } catch (pdfErr: any) {
        console.error("[GRN PDF PARSE]", pdfErr.message)
        return NextResponse.json({ error: "PDF processing error: " + pdfErr.message }, { status: 500 })
      }
    } else if (file.type.startsWith("image/")) {
      const worker = await getWorker()
      const result = await worker.recognize(buffer)
      rawText = result.data.text
      confidence = Math.round(result.data.confidence ?? 0)
    } else {
      return NextResponse.json({ error: "Unsupported file type" }, { status: 400 })
    }

    const processedText = normaliseOcrText(rawText ?? "")

    return NextResponse.json({
      raw_text: processedText,
      confidence,
    })
  } catch (err: unknown) {
    _worker = null
    const message = err instanceof Error ? err.message : "OCR failed"
    console.error("[GRN OCR]", message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
