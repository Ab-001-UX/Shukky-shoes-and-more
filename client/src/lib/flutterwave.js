export function loadFlutterwaveScript() {
  return new Promise((resolve, reject) => {
    if (window.FlutterwaveCheckout) {
      return resolve(window.FlutterwaveCheckout)
    }

    const script = document.createElement('script')
    script.src = 'https://checkout.flutterwave.com/v3.js'
    script.async = true
    script.onload = () => resolve(window.FlutterwaveCheckout)
    script.onerror = () => reject(new Error('Failed to load Flutterwave script'))
    document.body.appendChild(script)
  })
}
