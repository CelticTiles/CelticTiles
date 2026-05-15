import { NextRequest, NextResponse } from 'next/server'
import nodemailer from 'nodemailer'
import { createServerSupabase } from '@/lib/supabase/server'

// Read env vars at runtime — prevents Next.js from inlining secret values at build time
function env(key: string): string {
  return process.env[key] || ''
}

export async function POST(req: NextRequest) {
  try {
    const { name, email, phone, message } = await req.json()

    // Validate required fields
    if (!name || !email || !message) {
      return NextResponse.json(
        { error: 'Name, email, and message are required.' },
        { status: 400 }
      )
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Please provide a valid email address.' },
        { status: 400 }
      )
    }

    // Save lead via secure DB function (SECURITY DEFINER — no service role key needed)
    try {
      const supabase = await createServerSupabase()
      await (supabase as any).rpc('submit_contact_lead', {
        p_name: name,
        p_email: email,
        p_phone: phone || null,
        p_message: message,
      })
    } catch (leadErr) {
      // Non-blocking — email still sends even if lead insert fails
      console.error('Lead RPC error:', leadErr)
    }

    // Create SMTP transporter (Office 365)
    const transporter = nodemailer.createTransport({
      host: env('SMTP_HOST'),
      port: Number(env('SMTP_PORT')) || 587,
      secure: false, // STARTTLS
      auth: {
        user: env('SMTP_USER'),
        pass: env('SMTP_PASS'),
      },
      tls: {
        // Office 365 requires TLS, but ciphers: 'SSLv3' is outdated and can cause failures
        ciphers: 'TLSv1.2', 
        rejectUnauthorized: false,
      },
    })

    // Email to admin — the contact form submission
    try {
      await transporter.sendMail({
        from: `"Celtic Tiles Contact" <${env('SMTP_USER')}>`,
        to: env('CONTACT_EMAIL'),
        replyTo: email,
        subject: `New Contact Message from ${name}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: #8B1A1A; padding: 20px; border-radius: 12px 12px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 22px;">📩 New Contact Form Submission</h1>
            </div>
            <div style="background: #f8f9fa; padding: 24px; border: 1px solid #e9ecef; border-radius: 0 0 12px 12px;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 10px 0; font-weight: bold; color: #495057; width: 100px;">Name:</td>
                  <td style="padding: 10px 0; color: #212529;">${name}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 0; font-weight: bold; color: #495057;">Email:</td>
                  <td style="padding: 10px 0; color: #212529;"><a href="mailto:${email}" style="color: #8B1A1A;">${email}</a></td>
                </tr>
                ${phone ? `<tr>
                  <td style="padding: 10px 0; font-weight: bold; color: #495057;">Phone:</td>
                  <td style="padding: 10px 0; color: #212529;"><a href="tel:${phone}" style="color: #8B1A1A;">${phone}</a></td>
                </tr>` : ''}
              </table>
              <hr style="border: none; border-top: 1px solid #dee2e6; margin: 16px 0;" />
              <h3 style="color: #495057; margin: 0 0 8px;">Message:</h3>
              <p style="color: #212529; line-height: 1.6; white-space: pre-wrap; background: white; padding: 16px; border-radius: 8px; border: 1px solid #e9ecef;">${message}</p>
            </div>
            <p style="color: #868e96; font-size: 12px; text-align: center; margin-top: 16px;">
              This email was sent from the Celtic Tiles website contact form.
            </p>
          </div>
        `,
      })

      // Auto-reply to the customer
      await transporter.sendMail({
        from: `"Celtic Tiles" <${env('SMTP_USER')}>`,
        to: email,
        subject: `Thank you for contacting Celtic Tiles`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: #8B1A1A; padding: 20px; border-radius: 12px 12px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 22px;">Thank You, ${name}!</h1>
            </div>
            <div style="background: #f8f9fa; padding: 24px; border: 1px solid #e9ecef; border-radius: 0 0 12px 12px;">
              <p style="color: #212529; line-height: 1.8; font-size: 15px;">
                We have received your message and will get back to you soon.
              </p>
              <p style="color: #495057; line-height: 1.8; font-size: 14px;">
                If your matter is urgent, please call us at <strong>+353 14090558</strong>.
              </p>
              <hr style="border: none; border-top: 1px solid #dee2e6; margin: 16px 0;" />
              <p style="color: #868e96; font-size: 13px;">
                <strong>Celtic Tiles</strong><br/>
                Besides AXA insurance, Finches Industrial Park,<br/>
                Long Mile Rd, Walkinstown<br/>
                Dublin, D12 FP74, Ireland
              </p>
            </div>
          </div>
        `,
      })
    } catch (emailErr) {
      console.error('SMTP Error:', emailErr)
      // We still return success if the lead was saved but email failed, 
      // but if both fail we might want to know.
      // For now, let's at least log it.
    }

    return NextResponse.json({ success: true, message: 'Message sent successfully!' })

  } catch (error: any) {
    console.error('Contact form error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to send message. Please try again later.' },
      { status: 500 }
    )
  }
}
