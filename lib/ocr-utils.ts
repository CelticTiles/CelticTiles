
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

export function isHeaderOrNoiseLine(line: string): boolean {
  const lower = line.toLowerCase()
  const words = lower.split(/\s+/).filter(Boolean)
  
  if (words.length === 0) return true
  
  // 1. Blacklist check
  if (BLACKLIST_WORDS.some(b => lower.includes(b))) return true
  
  // 2. Header word density check
  const headerWordCount = words.filter(w => HEADER_WORDS.some(h => w.includes(h))).length
  if (headerWordCount / (words.length || 1) > 0.7) return true
  
  // 3. Date / Alb pattern check
  if (/\d{2,}\/\d{2,}\/\d{4}/.test(line) || /alb\./i.test(line)) return true
  
  // 4. Pure numeric noise
  if (/^[\d\s.,€$-]+$/.test(line)) return true
  
  // 5. Product line pattern (STRICT)
  // [Qty] [Code] [Description...]
  const isProductPattern = /^\d+([.,]\d+)?\s+[A-Z0-9/.-]+\s+.+/.test(line.trim())
  

  if (isProductPattern) return false

  // Otherwise, if it has very few words, it's likely noise
  if (words.length < 2) return true

  return false
}

export function normaliseOcrText(raw: string): string {
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
