import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ShoppingCart, ArrowRight, Truck } from 'lucide-react'
import { useCartStore } from '../store/cartStore'
import CartItem from '../components/cart/CartItem'
import { formatPrice } from '../utils/formatPrice'
import api from '../lib/api'
import styles from './Cart.module.css'

export default function Cart() {
  const { items } = useCartStore()
  const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0)
  const [hasActiveOrder, setHasActiveOrder] = useState(false)

  useEffect(() => {
    const checkActiveOrder = async () => {
      try {
        const { data: recentData } = await api.get('/orders/recent/mine')
        if (recentData.data && recentData.data.fulfillmentStatus !== 'DELIVERED') {
          setHasActiveOrder(true)
          return
        }
      } catch {
        // Not logged in — try localStorage
      }

      try {
        const orderId = localStorage.getItem('shukky_last_order_id')
        if (orderId) {
          const { data } = await api.get(`/orders/${orderId}`)
          if (data.data && data.data.fulfillmentStatus !== 'DELIVERED') {
            setHasActiveOrder(true)
          }
        }
      } catch {
        // No order found
      }
    }

    checkActiveOrder()
  }, [])

  if (items.length === 0 && !hasActiveOrder) {
    return (
      <div className="container">
        <div className={styles.emptyState}>
          <ShoppingCart size={64} className={styles.emptyIcon} />
          <h2>Your cart is empty</h2>
          <p>Looks like you haven't added anything yet.</p>
          <Link to="/shop" className={styles.shopBtn}>
            Start Shopping
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="container" style={{ paddingBottom: 'var(--space-16)', paddingTop: 'var(--space-8)' }}>
      <h1 className={styles.title}>Shopping Cart</h1>

      {hasActiveOrder && (
        <Link to="/track-order" className={styles.trackBanner}>
          <Truck size={20} />
          <span>You have an active order — <strong>Track it here</strong></span>
          <ArrowRight size={16} />
        </Link>
      )}
      
      <div className={styles.layout}>
        <div className={styles.itemsSection}>
          {items.length > 0 ? (
            items.map(item => (
              <CartItem key={item.cartItemId} item={item} />
            ))
          ) : (
            <div className={styles.emptyCartMessage}>
              <p>Your cart is empty.</p>
              <Link to="/shop" className={styles.shopBtnSmall}>Continue Shopping</Link>
            </div>
          )}
        </div>
        
        {items.length > 0 && (
          <div className={styles.summarySection}>
            <div className={styles.summaryCard}>
              <h3>Order Summary</h3>
              
              <div className={styles.summaryRow}>
                <span>Subtotal</span>
                <span>{formatPrice(total)}</span>
              </div>
              
              <div className={styles.summaryRow}>
                <span>Shipping</span>
                <span>Calculated at checkout</span>
              </div>
              
              <div className={styles.divider} />
              
              <div className={styles.totalRow}>
                <span>Total</span>
                <span className={styles.totalAmount}>{formatPrice(total)}</span>
              </div>
              
              <Link to="/checkout" className={styles.checkoutBtn}>
                Proceed to Checkout <ArrowRight size={18} />
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

