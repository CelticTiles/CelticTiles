import { NextResponse } from "next/server"
import { getServerSession } from "@/lib/loaders"
import { normaliseOcrText } from "@/lib/ocr-utils"

export const runtime = "nodejs"

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

    console.log(`[GRN OCR] Processing file: ${file.name} (${file.type}, ${file.size} bytes)`)

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
              const fullText = Object.keys(rows)
                .sort((a, b) => Number(a) - Number(b))
                .map((y) => rows[Number(y)].sort((a, b) => a.x - b.x).map(i => i.text).join(" "))
                .join("\n")
              resolve(fullText)
            } else if (item.text) {
              const y = Math.round(item.y * 100)
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
      // Image OCR is now handled on the client to avoid 502 timeouts on Netlify
      return NextResponse.json({ error: "Please perform OCR on the client for images." }, { status: 400 })
    } else {
      return NextResponse.json({ error: "Unsupported file type" }, { status: 400 })
    }

    const processedText = normaliseOcrText(rawText ?? "")

    return NextResponse.json({
      raw_text: processedText,
      confidence,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "OCR failed"
    console.error("[GRN OCR ERROR]", message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
