export function securityHeaders(req, res, next) {
  // Content Security Policy (CSP)
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.flutterwave.com; " +
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
    "font-src 'self' https://fonts.gstatic.com; " +
    "img-src 'self' data: https://res.cloudinary.com https://images.unsplash.com; " +
    "connect-src 'self' https://api.flutterwave.com https://api.cloudinary.com; " +
    "frame-src 'self' https://js.flutterwave.com;"
  )

  // Prevent Clickjacking (framing)
  res.setHeader('X-Frame-Options', 'DENY')

  // Prevent MIME-type Sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff')

  // XSS Protection for older browsers
  res.setHeader('X-XSS-Protection', '1; mode=block')

  // Referrer Policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')

  // Enforce HSTS (Strict Transport Security)
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload')
  }

  next()
}
