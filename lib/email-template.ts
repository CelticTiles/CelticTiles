// Reusable HTML email template for order status notifications

interface EmailTemplateOptions {
  customerName: string
  orderNumber: string
  status: string
  total: string
  message: string
}

/**
 * Returns a clean, professional HTML email for order status notifications.
 * Uses inline CSS for maximum email client compatibility.
 */
export function getOrderEmailHtml({
  customerName,
  orderNumber,
  status,
  total,
  message,
}: EmailTemplateOptions): string {
  // Status-specific accent color
  const statusColors: Record<string, string> = {
    Placed: '#22c55e',
    Pending: '#f59e0b',
    Confirmed: '#ef4444',
    Processing: '#3b82f6',
    Ready: '#8b5cf6',
    Shipped: '#eab308',
    Delivered: '#22c55e',
    Cancelled: '#6b7280',
  }
  const accentColor = statusColors[status] || '#1a1a2e'
  const brandColor = '#1a1a2e' // Celtic Tiles dark brand

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Celtic Tiles - Order ${status}</title>
</head>
<body style="margin:0; padding:0; background-color:#f4f4f5; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff; border-radius:8px; overflow:hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          
          <!-- Header -->
          <tr>
            <td style="background-color:${brandColor}; padding: 24px 32px; text-align:center;">
              <h1 style="margin:0; color:#ffffff; font-size:24px; font-weight:700; letter-spacing:0.5px;">
                Celtic Tiles
              </h1>
            </td>
          </tr>

          <!-- Status Bar -->
          <tr>
            <td style="background-color:${accentColor}; padding: 12px 32px; text-align:center;">
              <span style="color:#ffffff; font-size:14px; font-weight:600; text-transform:uppercase; letter-spacing:1px;">
                Order ${status}
              </span>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 32px;">
              <p style="margin:0 0 16px; font-size:16px; color:#1a1a2e;">
                Hi <strong>${customerName}</strong>,
              </p>
              <p style="margin:0 0 24px; font-size:15px; color:#4a4a5a; line-height:1.6;">
                ${message}
              </p>

              <!-- Order Details Box -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8f8fa; border-radius:6px; margin-bottom:24px;">
                <tr>
                  <td style="padding: 20px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding: 6px 0; font-size:14px; color:#6b7280;">Order Number</td>
                        <td style="padding: 6px 0; font-size:14px; color:#1a1a2e; font-weight:600; text-align:right;">${orderNumber}</td>
                      </tr>
                      <tr>
                        <td style="padding: 6px 0; font-size:14px; color:#6b7280;">Status</td>
                        <td style="padding: 6px 0; font-size:14px; font-weight:600; text-align:right; color:${accentColor};">${status}</td>
                      </tr>
                      <tr>
                        <td colspan="2" style="padding: 8px 0 0;">
                          <hr style="border:none; border-top:1px solid #e5e7eb; margin:0;" />
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0 0; font-size:15px; color:#1a1a2e; font-weight:600;">Total</td>
                        <td style="padding: 8px 0 0; font-size:18px; color:${brandColor}; font-weight:700; text-align:right;">€${total}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 8px; font-size:14px; color:#6b7280; line-height:1.5;">
                If you have any questions about your order, please don't hesitate to contact us.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#f8f8fa; padding: 24px 32px; border-top: 1px solid #e5e7eb;">
              <p style="margin:0 0 4px; font-size:14px; color:#1a1a2e; font-weight:600;">
                Regards,
              </p>
              <p style="margin:0 0 12px; font-size:14px; color:#1a1a2e; font-weight:700;">
                Celtic Tiles
              </p>
              <p style="margin:0; font-size:12px; color:#9ca3af;">
                This is an automated email. Please do not reply directly to this message.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim()
}

/**
 * Returns an HTML email template for notifying the admin about a new order.
 */
export function getAdminNewOrderEmailHtml({
  customerName,
  orderNumber,
  total,
}: {
  customerName: string
  orderNumber: string
  total: string
}): string {
  const brandColor = "#1a1a2e"
  const accentColor = "#3b82f6" // Info/Blue for admin

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Order Received - ${orderNumber}</title>
</head>
<body style="margin:0; padding:0; background-color:#f4f4f5; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff; border-radius:8px; overflow:hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          
          <!-- Header -->
          <tr>
            <td style="background-color:${brandColor}; padding: 24px 32px; text-align:center;">
              <h1 style="margin:0; color:#ffffff; font-size:20px; font-weight:700;">
                Celtic Tiles Admin
              </h1>
            </td>
          </tr>

          <!-- Status Bar -->
          <tr>
            <td style="background-color:${accentColor}; padding: 12px 32px; text-align:center;">
              <span style="color:#ffffff; font-size:14px; font-weight:600; text-transform:uppercase;">
                New Order Received
              </span>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 32px;">
              <p style="margin:0 0 16px; font-size:16px; color:#1a1a2e;">
                Hello Admin,
              </p>
              <p style="margin:0 0 24px; font-size:15px; color:#4a4a5a; line-height:1.6;">
                A new order has been placed on the Celtic Tiles website.
              </p>

              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8f8fa; border-radius:6px; margin-bottom:24px;">
                <tr>
                  <td style="padding: 20px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding: 6px 0; font-size:14px; color:#6b7280;">Order Number</td>
                        <td style="padding: 6px 0; font-size:14px; color:#1a1a2e; font-weight:600; text-align:right;">${orderNumber}</td>
                      </tr>
                      <tr>
                        <td style="padding: 6px 0; font-size:14px; color:#6b7280;">Customer</td>
                        <td style="padding: 6px 0; font-size:14px; color:#1a1a2e; font-weight:600; text-align:right;">${customerName}</td>
                      </tr>
                      <tr>
                        <td style="padding: 6px 0; font-size:14px; color:#6b7280;">Total Amount</td>
                        <td style="padding: 6px 0; font-size:14px; color:#1a1a2e; font-weight:700; text-align:right;">€${total}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <div style="text-align:center;">
                <a href="${process.env.NEXT_PUBLIC_APP_URL}/admin/orders" style="display:inline-block; background-color:${brandColor}; color:#ffffff; padding: 12px 24px; border-radius:6px; text-decoration:none; font-weight:600; font-size:14px;">
                  View All Orders
                </a>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#f8f8fa; padding: 24px 32px; border-top: 1px solid #e5e7eb; text-align:center;">
              <p style="margin:0; font-size:12px; color:#9ca3af;">
                Celtic Tiles CRM System
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim()
}
