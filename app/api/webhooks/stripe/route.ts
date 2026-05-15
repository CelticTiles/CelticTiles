// This endpoint just forwards to Supabase Edge Function
// The actual webhook handling happens in Supabase Edge Function

import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const body = await req.text()
    const signature = req.headers.get('stripe-signature')

    // Forward to Supabase Edge Function
    // ✅ Must include Authorization header — Supabase Edge Functions require it
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/stripe-webhook`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain',
          'stripe-signature': signature || '',
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
        },
        body: body,
      }
    )

    const data = await response.json()
    return NextResponse.json(data, { status: response.status })
  } catch (error) {
    console.error('Webhook forward error:', error)
    return NextResponse.json({ error: 'Webhook failed' }, { status: 500 })
  }
}

