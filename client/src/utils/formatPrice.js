export function formatPrice(amountInKobo) {
  if (amountInKobo == null) return '₦0.00'
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 2,
  }).format(amountInKobo / 100)
}
