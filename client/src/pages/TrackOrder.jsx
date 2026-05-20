import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { CheckCircle, Clock, Truck, Package, ShoppingBag, ArrowLeft, MessageCircle } from 'lucide-react'
import api from '../lib/api'
import { formatPrice } from '../utils/formatPrice'
import styles from './TrackOrder.module.css'

export default function TrackOrder() {
  const [order, setOrder] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isConfirming, setIsConfirming] = useState(false)
  const [showNoFlow, setShowNoFlow] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    const fetchOrder = async () => {
      setIsLoading(true)
      
      // Try 1: Server (logged-in users)
      try {
        const { data: recentData } = await api.get('/orders/recent/mine')
        if (recentData.data) {
          if (recentData.data.fulfillmentStatus === 'DELIVERED') {
            navigate('/cart', { replace: true })
            return
          }
          setOrder(recentData.data)
          setIsLoading(false)
          return
        }
      } catch {
        // Not logged in — fall through
      }

      // Try 2: Query Param or localStorage (guest users)
      try {
        const queryParams = new URLSearchParams(window.location.search)
        const orderIdFromUrl = queryParams.get('id')
        const orderId = orderIdFromUrl || localStorage.getItem('shukky_last_order_id')
        
        if (orderId) {
          const { data } = await api.get(`/orders/${orderId}`)
          if (data.data.fulfillmentStatus === 'DELIVERED') {
            navigate('/cart', { replace: true })
            return
          }
          setOrder(data.data)
        }
      } catch {
        setError('Could not find your order.')
      }

      setIsLoading(false)
    }

    fetchOrder()
  }, [navigate])

  async function handleConfirmDelivery() {
    if (!order) return
    setIsConfirming(true)
    try {
      await api.patch(`/orders/${order.id}/confirm-delivery`)
      navigate('/cart', { replace: true })
    } catch (err) {
      setError(err.message || 'Failed to confirm delivery')
    } finally {
      setIsConfirming(false)
    }
  }

  const getStatusInfo = (order) => {
    if (order.fulfillmentStatus === 'SHIPPED') {
      return {
        label: 'Sent Out',
        icon: <Truck size={48} />,
        class: 'statusSentOut',
        message: 'Your package is with the rider and is on its way to you!',
      }
    }
    if (order.fulfillmentStatus === 'PROCESSING') {
      return {
        label: 'Preparing Your Order',
        icon: <Package size={48} />,
        class: 'statusProcessing',
        message: 'Shukky is packaging your items right now!',
      }
    }
    if (order.paymentStatus === 'SUCCESS') {
      return {
        label: 'Order Confirmed',
        icon: <CheckCircle size={48} />,
        class: 'statusConfirmed',
        message: 'We have received your payment and are preparing your items.',
      }
    }
    if (order.deliveryDetails?.paymentMethod === 'ON_DELIVERY') {
      return {
        label: 'Awaiting Store Visit',
        icon: <Clock size={48} />,
        class: 'statusPending',
        message: 'Shukky Shoes will review your order and call you shortly.',
      }
    }
    return {
      label: 'Reviewing Order',
      icon: <Clock size={48} />,
      class: 'statusPending',
      message: 'Shukky Shoes will review your order details and call you shortly.',
    }
  }

  // Calculate days since order was created
  const getDaysSinceOrder = (order) => {
    const created = new Date(order.createdAt)
    const now = new Date()
    return Math.floor((now - created) / (1000 * 60 * 60 * 24))
  }

  if (isLoading) {
    return (
      <div className={styles.stateWrapper}>
        <div className={styles.spinner}></div>
        <p className={styles.stateMessage}>Loading order...</p>
      </div>
    )
  }

  if (error || !order) {
    return (
      <div className={styles.stateWrapper}>
        <ShoppingBag size={48} className={styles.emptyIcon} />
        <p className={styles.stateMessage}>{error || 'No active orders found.'}</p>
        <Link to="/cart" className={styles.backBtn}>Back to Cart</Link>
      </div>
    )
  }

  const statusInfo = getStatusInfo(order)
  const daysSince = getDaysSinceOrder(order)
  const isShipped = order.fulfillmentStatus === 'SHIPPED'

  // Build progress steps
  const steps = [
    { label: 'Order Placed', done: true },
    { label: 'Confirmed', done: order.paymentStatus === 'SUCCESS' },
    { label: 'Preparing', done: ['PROCESSING', 'SHIPPED', 'DELIVERED'].includes(order.fulfillmentStatus) },
    { label: 'Sent Out', done: ['SHIPPED', 'DELIVERED'].includes(order.fulfillmentStatus) },
  ]

  return (
    <div className="container" style={{ paddingBottom: 'var(--space-16)', paddingTop: 'var(--space-8)' }}>
      <Link to="/cart" className={styles.backLink}>
        <ArrowLeft size={18} /> Back to Cart
      </Link>

      <div className={styles.card}>
        <div className={`${styles.statusHeader} ${styles[statusInfo.class]}`}>
          <div className={styles.statusIcon}>{statusInfo.icon}</div>
          <h1 className={styles.statusLabel}>{statusInfo.label}</h1>
          <p className={styles.statusMessage}>{statusInfo.message}</p>
        </div>

        {/* Delivery confirmation prompt */}
        {isShipped && !showNoFlow && (
          <div className={styles.reminderSection}>
            <div className={styles.reminderCard}>
              <p className={styles.reminderText}>
                {daysSince >= 3
                  ? `Your order was sent out ${daysSince} days ago. Have you received your package?`
                  : 'Have you received your package?'
                }
              </p>
              <div className={styles.reminderActions}>
                <button
                  onClick={handleConfirmDelivery}
                  disabled={isConfirming}
                  className={styles.yesBtn}
                >
                  {isConfirming ? 'Confirming...' : 'Yes, I received it'}
                </button>
                <button
                  onClick={() => setShowNoFlow(true)}
                  className={styles.noBtn}
                >
                  No, I haven&apos;t
                </button>
              </div>
            </div>
          </div>
        )}

        {/* No flow — offer contact or dismiss */}
        {isShipped && showNoFlow && (
          <div className={styles.reminderSection}>
            <div className={styles.reminderCard}>
              <p className={styles.reminderText}>
                We&apos;re sorry your package hasn&apos;t arrived yet. Would you like to contact Shukky Shoes about your order?
              </p>
              <div className={styles.reminderActions}>
                <Link to="/contact" className={styles.contactBtn}>
                  <MessageCircle size={16} /> Contact Shukky
                </Link>
                <button
                  onClick={() => setShowNoFlow(false)}
                  className={styles.dismissBtn}
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Progress bar */}
        <div className={styles.progressSection}>
          <div className={styles.progressTrack}>
            {steps.map((step, i) => (
              <div key={step.label} className={styles.progressStep}>
                <div className={`${styles.dot} ${step.done ? styles.dotDone : ''}`}>
                  {step.done && <CheckCircle size={14} />}
                </div>
                <span className={`${styles.stepLabel} ${step.done ? styles.stepDone : ''}`}>
                  {step.label}
                </span>
                {i < steps.length - 1 && (
                  <div className={`${styles.connector} ${step.done ? styles.connectorDone : ''}`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Order details */}
        <div className={styles.details}>
          <div className={styles.metaRow}>
            <span className={styles.metaLabel}>Order ID</span>
            <span className={styles.metaValue}>#{order.id.slice(-6).toUpperCase()}</span>
          </div>
          <div className={styles.metaRow}>
            <span className={styles.metaLabel}>Date</span>
            <span className={styles.metaValue}>{new Date(order.createdAt).toLocaleDateString()}</span>
          </div>
          <div className={styles.metaRow}>
            <span className={styles.metaLabel}>Total</span>
            <span className={styles.metaValueAccent}>{formatPrice(order.totalAmount)}</span>
          </div>
        </div>

        <div className={styles.divider} />

        {/* Items */}
        <div className={styles.itemsSection}>
          <h3 className={styles.sectionTitle}>Items Ordered</h3>
          {order.items.map(item => (
            <div key={item.id} className={styles.item}>
              {item.product.images?.[0] && (
                <img
                  src={`${item.product.images[0]}?w=80&q=auto&f=auto`}
                  alt={item.product.name}
                  className={styles.itemImage}
                />
              )}
              <div className={styles.itemInfo}>
                <span className={styles.itemName}>{item.product.name}</span>
                <span className={styles.itemQty}>Qty: {item.quantity}</span>
              </div>
              <span className={styles.itemPrice}>{formatPrice(item.price * item.quantity)}</span>
            </div>
          ))}
        </div>

        <div className={styles.actions}>
          <Link to="/shop" className={styles.shopBtn}>
            <ShoppingBag size={18} /> Continue Shopping
          </Link>
        </div>
      </div>
    </div>
  )
}

