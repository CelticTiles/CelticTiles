import { NextResponse } from "next/server"

interface AuthAuditPayload {
  event?: string
  role?: string
  userId?: string
  source?: string
  path?: string
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as AuthAuditPayload

    const event = body.event || "unknown"
    const role = body.role || "unknown"
    const userId = body.userId || "unknown"
    const source = body.source || "unknown"
    const path = body.path || "unknown"

    console.info(
      `[AUTH_AUDIT] event=${event} role=${role} userId=${userId} source=${source} path=${path}`
    )

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("[AUTH_AUDIT] Failed to record event", error)
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}
