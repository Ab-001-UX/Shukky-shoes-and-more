import { Resend } from 'resend'

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null
const fromEmail = process.env.EMAIL_FROM || 'onboarding@resend.dev'
// Handle multiple admin emails as an array
const adminEmails = (process.env.ADMIN_EMAIL || 'adetomiwaabimbola@gmail.com').split(',').map(e => e.trim())

function formatPrice(amountInKobo) {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 2,
  }).format(amountInKobo / 100)
}

export async function sendOrderConfirmationEmail(order) {
  try {
    const itemsList = order.items.map(item => 
      `<li>${item.quantity}x ${item.product.name} - ${formatPrice(item.price * item.quantity)}</li>`
    ).join('')

    const html = `
      <h1>Your Shukky order is confirmed 🎉</h1>
      <p>Thank you for shopping with Shukky Shoes & More!</p>
      <p><strong>Order ID:</strong> ${order.id}</p>
      
      <h3>Order Summary</h3>
      <ul>${itemsList}</ul>
      <p><strong>Total:</strong> ${formatPrice(order.totalAmount)}</p>
      
      <h3>Delivery Details</h3>
      <p>${order.deliveryDetails.fullName}</p>
      <p>${order.deliveryDetails.address}</p>
      <p>${order.deliveryDetails.city}, ${order.deliveryDetails.state}</p>
      <p>${order.deliveryDetails.phone}</p>
    `

    // Use order's user email OR the email provided in delivery details for guest checkouts
    const buyerEmail = order.user?.email || order.deliveryDetails?.email
    if (!buyerEmail) {
      console.log('No buyer email found for order', order.id)
      return
    }

    if (!resend) {
      console.log('Resend API key missing. Would have sent order confirmation to:', buyerEmail)
      return
    }

    await resend.emails.send({
      from: fromEmail,
      to: buyerEmail,
      subject: 'Your Shukky order is confirmed 🎉',
      html
    })
  } catch (error) {
    console.error('Failed to send confirmation email', error)
  }
}

export async function sendAdminNotificationEmail(order) {
  try {
    const itemsList = order.items.map(item => 
      `<li>${item.quantity}x ${item.product.name} - ${formatPrice(item.price * item.quantity)}</li>`
    ).join('')

    const html = `
      <h1>New Order Received</h1>
      <p><strong>Order ID:</strong> ${order.id}</p>
      <p><strong>Amount:</strong> ${formatPrice(order.totalAmount)}</p>
      <p><strong>Payment Method:</strong> ${order.deliveryDetails?.paymentMethod === 'ON_DELIVERY' ? 'Pay on Delivery / In Person' : 'Paid Online (Flutterwave)'}</p>
      
      <h3>Customer Details</h3>
      <p>Name: ${order.deliveryDetails.fullName}</p>
      <p>Phone: ${order.deliveryDetails.phone}</p>
      <p>Email: ${order.deliveryDetails.email || 'N/A'}</p>
      
      <h3>Delivery Address</h3>
      <p>${order.deliveryDetails.address}</p>
      <p>${order.deliveryDetails.city}, ${order.deliveryDetails.state}</p>
      ${order.deliveryDetails.notes ? `<p>Notes: ${order.deliveryDetails.notes}</p>` : ''}
      
      <h3>Items Ordered</h3>
      <ul>${itemsList}</ul>
    `

    if (!resend) {
      console.log('Resend API key missing. Would have sent admin notification to:', adminEmail)
      return
    }

    await resend.emails.send({
      from: fromEmail,
      to: adminEmails,
      subject: `New order received — ${formatPrice(order.totalAmount)}`,
      html
    })
  } catch (error) {
    console.error('Failed to send admin notification email', error)
  }
}

export async function sendPasswordResetEmail(email, token) {
  try {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173'
    const resetLink = `${frontendUrl}/reset-password?token=${token}`

    const html = `
      <h1>Reset Your Password</h1>
      <p>You requested a password reset for your Shukky Shoes account.</p>
      <p>Click the link below to reset your password. This link will expire in 1 hour.</p>
      <p><a href="${resetLink}" style="display: inline-block; padding: 10px 20px; background-color: #0A0A0A; color: white; text-decoration: none; border-radius: 4px;">Reset Password</a></p>
      <p>If you did not request this, please ignore this email.</p>
    `

    if (!resend) {
      console.log('Resend API key missing. Would have sent password reset to:', email)
      return
    }

    await resend.emails.send({
      from: fromEmail,
      to: email,
      subject: 'Reset Your Password - Shukky Shoes',
      html
    })
  } catch (error) {
    console.error('Failed to send password reset email', error)
  }
}

