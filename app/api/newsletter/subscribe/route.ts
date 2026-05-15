  import { NextRequest, NextResponse } from 'next/server'
  import { createServerClient } from '@supabase/ssr'
  import { cookies } from 'next/headers'
  import type { Database } from '@/supabase/database.types'

  const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

  export async function POST(request: NextRequest) {
    try {
      const body = await request.json()
      const { email, name } = body

      if (!email || typeof email !== 'string') {
        return NextResponse.json(
          { error: 'Email is required' },
          { status: 400 }
        )
      }

      const sanitizedEmail = email.toLowerCase().trim()

      if (!EMAIL_REGEX.test(sanitizedEmail)) {
        return NextResponse.json(
          { error: 'Invalid email format' },
          { status: 400 }
        )
      }

      const cookieStore = await cookies()
      const supabase = createServerClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            getAll() {
              return cookieStore.getAll()
            },
            setAll() {},
          },
        }
      )

      const { data: existing, error: checkError } = await supabase
        .from('newsletter_subscriptions')
        .select('id, status')
        .eq('email', sanitizedEmail)
        .maybeSingle()

      if (checkError) {
        console.error('Newsletter check error:', checkError)
        return NextResponse.json(
          { error: 'Failed to check subscription' },
          { status: 500 }
        )
      }

      if (existing) {
        if (existing.status === 'active') {
          return NextResponse.json(
            { error: 'This email is already subscribed' },
            { status: 409 }
          )
        }
      }

      const { error: insertError } = await supabase
        .from('newsletter_subscriptions')
        .insert({
          email: sanitizedEmail,
          name: name?.trim() || null,
          status: 'active',
        })

      if (insertError) {
        console.error('Newsletter insert error:', insertError)
        return NextResponse.json(
          { error: 'Failed to subscribe. Please try again.' },
          { status: 500 }
        )
      }

      return NextResponse.json({ success: true }, { status: 200 })
    } catch (error) {
      console.error('Newsletter API error:', error)
      return NextResponse.json(
        { error: 'An unexpected error occurred' },
        { status: 500 }
      )
    }
  }
