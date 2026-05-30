import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Lock, Info, MapPin } from 'lucide-react'
import Spinner from '../components/ui/Spinner'
import { formatPrice } from '../utils/formatPrice'
import { loadFlutterwaveScript } from '../lib/flutterwave'
import api from '../lib/api'
import { useCartStore } from '../store/cartStore'
import { useAuthStore } from '../store/authStore'
import styles from './Checkout.module.css'

export default function Checkout() {
  const { items } = useCartStore()
  const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0)
  const { isAuthenticated, user } = useAuthStore()
  const navigate = useNavigate()

  const [formData, setFormData] = useState({
    fullName: user?.name || '',
    email: user?.email || '',
    phone: '',
    address: '',
    city: '',
    state: '',
    method: 'RIDER', // RIDER or IN_PERSON
    paymentMethod: 'ONLINE', // ONLINE or ON_DELIVERY
    pickupPerson: 'SELF', // SELF, OTHER, RIDER
    pickerName: '',
    pickerPhone: '',
    pickerGender: '', // MALE, FEMALE
    notes: ''
  })
  const [agreedToFee, setAgreedToFee] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (items.length === 0) {
      navigate('/cart')
    }
  }, [items, navigate])

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleMethodChange = (method) => {
    setFormData({ 
      ...formData, 
      method,
      // Reset payment method to ONLINE if switching to RIDER (unless we allow POD for rider later)
      paymentMethod: method === 'RIDER' ? 'ONLINE' : formData.paymentMethod 
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (formData.method === 'RIDER' && !agreedToFee) {
      setError('Please agree to pay the delivery fee to continue.')
      return
    }

    if (formData.method === 'IN_PERSON' && formData.pickupPerson === 'OTHER' && (!formData.pickerName || !formData.pickerPhone || !formData.pickerGender)) {
      setError('Please provide name, phone and gender for the person picking up.')
      return
    }

    if (formData.method === 'IN_PERSON' && formData.pickupPerson === 'RIDER' && !formData.pickerPhone) {
      setError('Please provide the rider\'s phone number.')
      return
    }

    setError(null)
    setIsSubmitting(true)

    // Prepare data for API
    const finalDetails = {
      ...formData,
      address: formData.method === 'IN_PERSON' ? 'In-Store Pickup (Balogun)' : formData.address,
      city: formData.method === 'IN_PERSON' ? 'Lagos' : formData.city,
      state: formData.method === 'IN_PERSON' ? 'Lagos' : formData.state,
    }

    try {
      const { data } = await api.post('/orders', {
        items,
        totalAmount: total,
        deliveryDetails: finalDetails
      })
      
      const { orderId, txRef } = data.data
      
      // Store order ID for tracking on the Cart page
      localStorage.setItem('shukky_last_order_id', orderId)

      // If user chose Pay in Person, redirect to confirmation directly
      if (formData.paymentMethod === 'ON_DELIVERY') {
        useCartStore.getState().clearCart()
        navigate(`/order-confirmation/${orderId}`)
        return
      }
      
      // Otherwise initialize Flutterwave
      const FlutterwaveCheckout = await loadFlutterwaveScript()
      
      if (FlutterwaveCheckout) {
        window.FlutterwaveCheckout({
          public_key: import.meta.env.VITE_FLW_PUBLIC_KEY,
          tx_ref: txRef,
          amount: total / 100,
          currency: 'NGN',
          payment_options: 'card,ussd,banktransfer',
          customer: {
            email: formData.email,
            phone_number: formData.phone,
            name: formData.fullName,
          },
          customizations: {
            title: 'Shukky Shoes & More',
            description: 'Payment for luxury footwear & bags',
            logo: 'https://shukkyshoes.com/logo.png',
          },
          callback: (payment) => {
            console.log('Payment complete', payment)
            const txId = payment.transaction_id || payment.id || ''
            useCartStore.getState().clearCart()
            navigate(`/order-confirmation/${orderId}?status=successful&transaction_id=${txId}`)
          },
          onclose: () => {
            console.log('Payment closed')
            setIsSubmitting(false)
          },
        })
      } else {
        throw new Error('Could not load payment widget')
      }
      
    } catch (err) {
      setError(err.message || 'Failed to place order.')
      setIsSubmitting(false)
    }
  }

  if (items.length === 0) return null

  return (
    <div className="container" style={{ paddingBottom: 'var(--space-16)', paddingTop: 'var(--space-8)' }}>
      <Link to="/cart" className={styles.backLink}>
        <ArrowLeft size={20} /> Back to Cart
      </Link>
      
      <h1 className={styles.title}>Checkout</h1>
      
      {error && <div className={styles.error}>{error}</div>}
      
      <div className={styles.layout}>
        <div className={styles.formSection}>
          <div className={styles.card}>
            <h2 className={styles.cardTitle}>Delivery Details</h2>
            
            {!isAuthenticated && (
              <div className={styles.guestNotice}>
                Checking out as a guest. <Link to="/login?redirect=/checkout">Sign in</Link> for faster checkout.
              </div>
            )}
            
            <form id="checkout-form" onSubmit={handleSubmit} className={styles.form}>
              <div className={styles.inputGroup}>
                <label className={styles.label}>How would you like to receive your items? *</label>
                <div className={styles.methodToggle}>
                  <button 
                    type="button" 
                    className={`${styles.methodBtn} ${formData.method === 'RIDER' ? styles.methodActive : ''}`}
                    onClick={() => handleMethodChange('RIDER')}
                  >
                    Delivery by Rider
                  </button>
                  <button 
                    type="button" 
                    className={`${styles.methodBtn} ${formData.method === 'IN_PERSON' ? styles.methodActive : ''}`}
                    onClick={() => handleMethodChange('IN_PERSON')}
                  >
                    In-Store Pickup
                  </button>
                </div>
              </div>

              {formData.method === 'RIDER' && (
                <div className={styles.feeAgreement}>
                  <label className={styles.checkboxLabel}>
                    <input 
                      type="checkbox" 
                      checked={agreedToFee} 
                      onChange={(e) => setAgreedToFee(e.target.checked)} 
                    />
                    <span>I agree to pay the delivery fee directly to the rider upon delivery.</span>
                  </label>
                  <p className={styles.feeNotice}>
                    <Info size={14} /> Fees vary based on your location.
                  </p>
                </div>
              )}

              {formData.method === 'IN_PERSON' && (
                <>
                  <div className={styles.inputGroup}>
                    <label className={styles.label}>How do you want to pay? *</label>
                    <div className={styles.methodToggle}>
                      <button 
                        type="button" 
                        className={`${styles.methodBtn} ${formData.paymentMethod === 'ONLINE' ? styles.methodActive : ''}`}
                        onClick={() => setFormData({ ...formData, paymentMethod: 'ONLINE' })}
                      >
                        Pay Online Now
                      </button>
                      <button 
                        type="button" 
                        className={`${styles.methodBtn} ${formData.paymentMethod === 'ON_DELIVERY' ? styles.methodActive : ''}`}
                        onClick={() => setFormData({ ...formData, paymentMethod: 'ON_DELIVERY' })}
                      >
                        Pay at the Store
                      </button>
                    </div>
                  </div>

                  <div className={styles.inputGroup}>
                    <label className={styles.label}>Who is coming to pick it up? *</label>
                    <div className={styles.methodToggle}>
                      <button 
                        type="button" 
                        className={`${styles.methodBtn} ${formData.pickupPerson === 'SELF' ? styles.methodActive : ''}`}
                        onClick={() => setFormData({ ...formData, pickupPerson: 'SELF' })}
                      >
                        Me
                      </button>
                      <button 
                        type="button" 
                        className={`${styles.methodBtn} ${formData.pickupPerson === 'OTHER' ? styles.methodActive : ''}`}
                        onClick={() => setFormData({ ...formData, pickupPerson: 'OTHER' })}
                      >
                        Family / Friend
                      </button>
                      <button 
                        type="button" 
                        className={`${styles.methodBtn} ${formData.pickupPerson === 'RIDER' ? styles.methodActive : ''}`}
                        onClick={() => setFormData({ ...formData, pickupPerson: 'RIDER' })}
                      >
                        A Rider
                      </button>
                    </div>
                  </div>

                  {formData.pickupPerson !== 'SELF' && (
                    <div className={styles.subFields}>
                      {formData.pickupPerson === 'OTHER' && (
                        <div className={styles.inputGroup}>
                          <label className={styles.label}>Picker's First Name *</label>
                          <input
                            name="pickerName"
                            type="text"
                            required
                            placeholder="First Name"
                            value={formData.pickerName}
                            onChange={handleChange}
                            className={styles.input}
                          />
                        </div>
                      )}

                      <div className={styles.inputGroup}>
                        <label className={styles.label}>
                          {formData.pickupPerson === 'RIDER' ? "Rider's Phone Number *" : "Picker's Phone Number *"}
                        </label>
                        <input
                          name="pickerPhone"
                          type="tel"
                          required
                          placeholder="080..."
                          value={formData.pickerPhone}
                          onChange={handleChange}
                          className={styles.input}
                        />
                      </div>
                      
                      {formData.pickupPerson === 'OTHER' && (
                        <div className={styles.inputGroup}>
                          <label className={styles.label}>Picker's Gender *</label>
                          <select 
                            name="pickerGender" 
                            required 
                            value={formData.pickerGender}
                            onChange={handleChange}
                            className={styles.input}
                          >
                            <option value="">Select Gender</option>
                            <option value="MALE">Male</option>
                            <option value="FEMALE">Female</option>
                          </select>
                        </div>
                      )}
                    </div>
                  )}

                  <div className={styles.pickupNotice}>
                    <p>Collect your items at our physical store at Balogun Market, Lagos.</p>
                    <Link to="/info" className={styles.locationLink}>
                      <MapPin size={14} /> View store location & hours
                    </Link>
                  </div>
                </>
              )}

              <div className={styles.inputGroup}>
                <label htmlFor="fullName" className={styles.label}>Full Name *</label>
                <input
                  id="fullName"
                  name="fullName"
                  type="text"
                  required
                  value={formData.fullName}
                  onChange={handleChange}
                  className={styles.input}
                />
              </div>

              <div className={styles.inputGroup}>
                <label htmlFor="email" className={styles.label}>Email Address *</label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  placeholder="For order confirmation"
                  value={formData.email}
                  onChange={handleChange}
                  className={styles.input}
                />
              </div>

              <div className={styles.inputGroup}>
                <label htmlFor="phone" className={styles.label}>Phone Number *</label>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  required
                  value={formData.phone}
                  onChange={handleChange}
                  className={styles.input}
                />
              </div>

              {/* Conditional Address Fields */}
              {formData.method === 'RIDER' && (
                <>
                  <div className={styles.inputGroup}>
                    <label htmlFor="address" className={styles.label}>Delivery Address *</label>
                    <input
                      id="address"
                      name="address"
                      type="text"
                      required
                      value={formData.address}
                      onChange={handleChange}
                      className={styles.input}
                    />
                  </div>

                  <div className={styles.row}>
                    <div className={styles.inputGroup}>
                      <label htmlFor="city" className={styles.label}>City *</label>
                      <input
                        id="city"
                        name="city"
                        type="text"
                        required
                        value={formData.city}
                        onChange={handleChange}
                        className={styles.input}
                      />
                    </div>
                    <div className={styles.inputGroup}>
                      <label htmlFor="state" className={styles.label}>State *</label>
                      <input
                        id="state"
                        name="state"
                        type="text"
                        required
                        value={formData.state}
                        onChange={handleChange}
                        className={styles.input}
                      />
                    </div>
                  </div>
                </>
              )}

              <div className={styles.inputGroup}>
                <label htmlFor="notes" className={styles.label}>Notes (Optional)</label>
                <textarea
                  id="notes"
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  className={styles.textarea}
                  rows="3"
                  placeholder={formData.method === 'IN_PERSON' ? 'e.g. Someone else will pick it up for me' : 'e.g. Gate code, landmark'}
                />
              </div>
            </form>
          </div>
        </div>

        <div className={styles.summarySection}>
          <div className={styles.card}>
            <h2 className={styles.cardTitle}>Order Summary</h2>
            
            <div className={styles.itemsList}>
              {items.map(item => (
                <div key={item.id} className={styles.summaryItem}>
                  <div className={styles.itemImageWrapper}>
                    <img 
                      src={`${item.images?.[0]}?w=100&q=auto&f=auto`} 
                      alt={item.name} 
                      className={styles.itemImage} 
                    />
                    <span className={styles.itemQty}>{item.quantity}</span>
                  </div>
                  <div className={styles.itemDetails}>
                    <span className={styles.itemName}>{item.name}</span>
                    <span className={styles.itemPrice}>{formatPrice(item.price * item.quantity)}</span>
                  </div>
                </div>
              ))}
            </div>
            
            <div className={styles.divider} />
            
            <div className={styles.totalsRow}>
              <span>Subtotal</span>
              <span>{formatPrice(total)}</span>
            </div>
            
            <div className={styles.totalsRow}>
              <span>Shipping</span>
              <span>{formData.method === 'RIDER' ? 'Pay to Rider' : 'Pick up'}</span>
            </div>
            
            <div className={styles.divider} />
            
            <div className={styles.finalTotal}>
              <span>Total</span>
              <span className={styles.totalAmount}>{formatPrice(total)}</span>
            </div>
            
            <button 
              type="submit" 
              form="checkout-form" 
              disabled={isSubmitting} 
              className={styles.payBtn}
            >
              {isSubmitting ? (
                <>
                  <Spinner size="sm" color="white" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  {formData.paymentMethod === 'ONLINE' && <Lock size={16} />}
                  <span>
                    {formData.paymentMethod === 'ONLINE' 
                      ? `Pay ${formatPrice(total)}` 
                      : 'Confirm Order'
                    }
                  </span>
                </>
              )}
            </button>
            <p className={styles.secureText}>Secure payment powered by Flutterwave</p>
          </div>
        </div>
      </div>
    </div>
  )
}
