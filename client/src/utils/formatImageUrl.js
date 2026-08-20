export function formatImageUrl(url, width = 400) {
  if (!url || typeof url !== 'string' || !url.trim()) {
    return 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400"><rect width="400" height="400" fill="%23F3F4F6"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="18" fill="%239CA3AF">No Image Available</text></svg>'
  }

  const trimmed = url.trim()

  // Base64 data URIs and blob URIs should be returned as-is
  if (trimmed.startsWith('data:') || trimmed.startsWith('blob:')) {
    return trimmed
  }

  // Cloudinary image URLs
  if (trimmed.includes('res.cloudinary.com')) {
    if (trimmed.includes('?')) {
      return `${trimmed}&w=${width}&q=auto&f=auto`
    }
    return `${trimmed}?w=${width}&q=auto&f=auto`
  }

  // External URLs with query strings (e.g. Unsplash) — do not break with a second '?'
  if (trimmed.includes('?')) {
    return trimmed
  }

  return trimmed
}
