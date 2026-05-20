import { useEffect, useState } from 'react'
import { useParams, Link, useSearchParams, useNavigate } from 'react-router-dom'
import { CheckCircle, XCircle, ShoppingBag, LogOut } from 'lucide-react'
import api from '../lib/api'
import { useCartStore } from '../store/cartStore'
import { useAuthStore } from '../store/authStore'
import { formatPrice } from '../utils/formatPrice'
import styles from './OrderConfirmation.module.css'

export default function OrderConfirmation() {
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const status = searchParams.get('status')
  const navigate = useNavigate()
  
  const [order, setOrder] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  
  const clearCart = useCartStore(state => state.clearCart)
  const logout = useAuthStore(state => state.logout)

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const transactionId = searchParams.get('transaction_id')
        
        let response
        if (transactionId) {
          // Verify payment with Flutterwave via our server
          response = await api.get(`/payment/verify/${id}?transaction_id=${transactionId}`)
        } else {
          // Just fetch the order (pay at store or revisit)
          response = await api.get(`/orders/${id}`)
        }
        
        const orderData = response.data.data
        setOrder(orderData)
        
        const isPayAtStore = orderData.deliveryDetails?.paymentMethod === 'ON_DELIVERY'
        
        // Clear cart for success or pay at store
        if (orderData.paymentStatus === 'SUCCESS' || status === 'successful' || isPayAtStore) {
          clearCart()
        }
      } catch (err) {
        setError('Could not load order details.')
      } finally {
        setIsLoading(false)
      }
    }

    fetchOrder()
  }, [id, status, clearCart, searchParams])

  const handleLogout = async () => {
    await logout()
    navigate('/welcome')
  }

  if (isLoading) {
    return (
      <div className={styles.stateWrapper}>
        <div className={styles.spinner}></div>
        <p className={styles.stateMessage}>Verifying your payment...</p>
      </div>
    )
  }

  if (error || !order) {
    return (
      <div className={styles.stateWrapper}>
        <p className={styles.stateMessage}>{error}</p>
        <Link to="/shop" className={styles.primaryBtn}>Return to Shop</Link>
      </div>
    )
  }

  const isPayAtStore = order.deliveryDetails?.paymentMethod === 'ON_DELIVERY'
  const isSuccess = order.paymentStatus === 'SUCCESS' || isPayAtStore

  return (
    <div className="container" style={{ paddingBottom: 'var(--space-16)', paddingTop: 'var(--space-8)' }}>
      <div className={styles.card}>
        <div className={styles.header}>
          {isSuccess ? (
            <CheckCircle className={styles.successIcon} size={64} />
          ) : (
            <XCircle className={styles.errorIcon} size={64} />
          )}
          
          <h1 className={styles.title}>
            {isPayAtStore ? 'Order Recorded!' : (isSuccess ? 'Payment Received!' : 'Payment Not Received')}
          </h1>
          
          <p className={styles.subtitle}>
            {isPayAtStore 
              ? 'Your order has been successfully recorded. Shukky Shoes will review your details and send a confirmation shortly. We look forward to seeing you!'
              : (isSuccess 
                  ? 'Thank you for your order. We are processing it right now.'
                  : 'We haven\'t received your payment yet. If you have paid, please contact us.')
            }
          </p>
          

        </div>

        {isSuccess && (
          <div className={styles.details}>
            <h3 className={styles.sectionTitle}>Order Summary</h3>
            
            <div className={styles.metaRow}>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>Order Status</span>
                <span className={`${styles.metaValue} ${isSuccess ? styles.textSuccess : styles.textError}`}>
                  {isPayAtStore ? 'PENDING PICKUP' : (isSuccess ? 'RECEIVED' : 'NOT RECEIVED')}
                </span>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>Order ID</span>
                <span className={styles.metaValue}>{order.id.slice(-8).toUpperCase()}</span>
              </div>
            </div>

            <div className={styles.divider} />

            <h3 className={styles.sectionTitle}>Items</h3>
            <div className={styles.itemsList}>
              {order.items.map(item => (
                <div key={item.id} className={styles.item}>
                  <div className={styles.itemInfo}>
                    <span className={styles.itemName}>{item.product.name}</span>
                    <span className={styles.itemQty}>x{item.quantity}</span>
                  </div>
                  <span className={styles.itemPrice}>{formatPrice(item.price * item.quantity)}</span>
                </div>
              ))}
            </div>
            
            <div className={styles.divider} />
            
            <div className={styles.totalRow}>
              <span>{isPayAtStore ? 'Total to Pay' : 'Total Paid'}</span>
              <span className={styles.totalAmount}>{formatPrice(order.totalAmount)}</span>
            </div>
          </div>
        )}

        {isSuccess && (
          <div className={styles.delivery}>
            <h3 className={styles.sectionTitle}>Pickup Information</h3>
            <p><strong>Name:</strong> {order.deliveryDetails.fullName}</p>
            <p><strong>Location:</strong> {order.deliveryDetails.address}</p>
            <p><strong>Phone:</strong> {order.deliveryDetails.phone}</p>
            {order.deliveryDetails.notes && (
              <p><strong>Note:</strong> {order.deliveryDetails.notes}</p>
            )}
          </div>
        )}

        <div className={styles.actions}>
          <Link to="/shop" className={isSuccess ? styles.primaryBtn : styles.secondaryBtn}>
            <ShoppingBag size={18} /> Continue Shopping
          </Link>
          
          {isSuccess && (
            <Link to={`/track-order?id=${order.id}`} className={styles.secondaryBtn}>
              Track Order
            </Link>
          )}
          
          {isPayAtStore ? (
            <button onClick={handleLogout} className={styles.secondaryBtn}>
              <LogOut size={18} /> Logout
            </button>
          ) : !isSuccess && (
            <>
              <Link to="/checkout" className={styles.primaryBtn}>Retry Payment</Link>
              <a href={`mailto:adetomiwaabimbola@gmail.com?subject=Order Help: ${order.id}`} className={styles.secondaryBtn}>
                Contact Her
              </a>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
