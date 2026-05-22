import nodemailer from 'nodemailer'
import { getOrderEmailHtml, getAdminNewOrderEmailHtml } from './email-template'

const ADMIN_EMAIL = 'admin@celtictiles.ie'

// Status-specific email content
const STATUS_CONTENT: Record<string, { subject: string; message: string }> = {
  Placed: {
    subject: 'Your Order Has Been Placed!',
    message:
      'Thank you for your order. We\'ve received it and will begin processing shortly.',
  },
  Pending: {
    subject: 'Your Order Is Pending',
    message:
      'Your order is pending confirmation. We\'ll update you once it\'s confirmed.',
  },
  Confirmed: {
    subject: 'Your Order Has Been Confirmed',
    message:
      'Great news! Your order has been confirmed and is now being prepared.',
  },
  Processing: {
    subject: 'Your Order Is Being Processed',
    message:
      'Your order is currently being processed. We\'ll update you once it\'s ready.',
  },
  Ready: {
    subject: 'Your Order Is Ready',
    message:
      'Your order has been prepared and is ready for dispatch.',
  },
  Shipped: {
    subject: 'Your Order Has Been Shipped',
    message:
      'Your order is on its way! You should receive it soon.',
  },
  Delivered: {
    subject: 'Your Order Has Been Delivered',
    message:
      'Your order has been delivered. We hope you love your tiles!',
  },
  Cancelled: {
    subject: 'Your Order Has Been Cancelled',
    message:
      'Your order has been cancelled. If you have any questions, please contact us.',
  },
}

/**
 * Creates a Nodemailer SMTP transporter using Office365 credentials from env.
 */
function createTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: false, // STARTTLS for port 587
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    tls: {
      ciphers: 'TLSv1.2',
      rejectUnauthorized: false,
    },
  })
}

interface SendOrderEmailOptions {
  customerName: string
  customerEmail: string
  orderNumber: string
  status: string
  total: string | number
  attachments?: Array<{
    filename: string
    content: Buffer
    contentType?: string
  }>
}

/**
 * Sends an order status email to the customer.
 * Call this after order creation or admin status update.
 */
export async function sendOrderStatusEmail({
  customerName,
  customerEmail,
  orderNumber,
  status,
  total,
  attachments,
}: SendOrderEmailOptions): Promise<{ success: boolean; error?: string }> {
  try {
    const content = STATUS_CONTENT[status]
    if (!content) {
      console.warn(`[Email] No email content defined for status: ${status}`)
      return { success: false, error: `Unknown status: ${status}` }
    }

    const formattedTotal =
      typeof total === 'number' ? total.toFixed(2) : parseFloat(total).toFixed(2)

    const html = getOrderEmailHtml({
      customerName,
      orderNumber,
      status,
      total: formattedTotal,
      message: content.message,
    })

    const transporter = createTransporter()

    await transporter.sendMail({
      from: `"Celtic Tiles" <${process.env.SMTP_USER}>`,
      to: customerEmail,
      subject: `${content.subject} - ${orderNumber}`,
      html,
      attachments,
    })

    console.log(`[Email] ✅ Sent "${content.subject}" to ${customerEmail} for order ${orderNumber}`)
    return { success: true }
  } catch (err: any) {
    console.error(`[Email] ❌ Failed to send email for order ${orderNumber}:`, err.message)
    return { success: false, error: err.message }
  }
}

/**
 * Sends a notification to the admin about a new order.
 */
export async function sendAdminNewOrderNotification({
  customerName,
  orderNumber,
  total,
}: {
  customerName: string
  orderNumber: string
  total: string | number
}): Promise<{ success: boolean; error?: string }> {
  try {
    const formattedTotal =
      typeof total === 'number' ? total.toFixed(2) : parseFloat(total).toFixed(2)

    const html = getAdminNewOrderEmailHtml({
      customerName,
      orderNumber,
      total: formattedTotal,
    })

    const transporter = createTransporter()

    await transporter.sendMail({
      from: `"Celtic Tiles CRM" <${process.env.SMTP_USER}>`,
      to: ADMIN_EMAIL,
      subject: `🔔 NEW ORDER RECEIVED - ${orderNumber}`,
      html,
    })

    console.log(`[Email] 🔔 Admin notification sent for order ${orderNumber}`)
    return { success: true }
  } catch (err: any) {
    console.error(`[Email] ❌ Failed to send admin notification for ${orderNumber}:`, err.message)
    return { success: false, error: err.message }
  }
}

/**
 * Sends a notification to an employee when a ticket is assigned to them.
 */
export async function sendTicketAssignmentEmail({
  assigneeEmail,
  assigneeName,
  ticketTitle,
  ticketPriority,
  ticketCategory,
  dueDate
}: {
  assigneeEmail: string
  assigneeName: string
  ticketTitle: string
  ticketPriority: string
  ticketCategory?: string | null
  dueDate?: string | null
}): Promise<{ success: boolean; error?: string }> {
  try {
    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #333; padding: 20px;">
        <h2 style="color: #1a365d; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px;">New Task Assigned</h2>
        <p>Hi ${assigneeName},</p>
        <p>A new task has been assigned to you in the Celtic Tiles Admin Portal:</p>
        <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; border: 1px solid #e2e8f0; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #0f172a;">${ticketTitle}</h3>
          <p style="margin: 5px 0;"><strong>Priority:</strong> <span style="background-color: #e2e8f0; padding: 2px 8px; border-radius: 12px; font-size: 12px;">${ticketPriority.toUpperCase()}</span></p>
          ${ticketCategory ? `<p style="margin: 5px 0;"><strong>Category:</strong> ${ticketCategory}</p>` : ''}
          ${dueDate ? `<p style="margin: 5px 0;"><strong>Due Date:</strong> ${new Date(dueDate).toLocaleDateString()}</p>` : ''}
        </div>
        <p style="margin-top: 30px;">
          <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/admin/tickets" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">View Task in Portal</a>
        </p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin-top: 40px;" />
        <p style="color: #94a3b8; font-size: 12px; text-align: center;">This is an automated message from Celtic Tiles CRM.</p>
      </div>
    `

    const transporter = createTransporter()

    await transporter.sendMail({
      from: \`"Celtic Tiles CRM" <\${process.env.SMTP_USER}>\`,
      to: assigneeEmail,
      subject: \`Task Assigned: \${ticketTitle}\`,
      html,
    })

    console.log(\`[Email] ✅ Sent ticket assignment to \${assigneeEmail} for "\${ticketTitle}"\`)
    return { success: true }
  } catch (err: any) {
    console.error(\`[Email] ❌ Failed to send ticket assignment to \${assigneeEmail}:\`, err.message)
    return { success: false, error: err.message }
  }
}

