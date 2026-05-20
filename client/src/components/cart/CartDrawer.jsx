import { X, ShoppingCart } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useCartStore } from '../../store/cartStore'
import CartItem from './CartItem'
import { formatPrice } from '../../utils/formatPrice'
import styles from './CartDrawer.module.css'

export default function CartDrawer() {
  const { isOpen, setIsOpen, items } = useCartStore()
  const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0)

  if (!isOpen) return null

  return (
    <>
      <div className={styles.overlay} onClick={() => setIsOpen(false)} />
      <div className={styles.drawer}>
        <div className={styles.header}>
          <h2>Your Cart</h2>
          <button className={styles.closeBtn} onClick={() => setIsOpen(false)}>
            <X size={24} />
          </button>
        </div>

        <div className={styles.content}>
          {items.length === 0 ? (
            <div className={styles.emptyState}>
              <ShoppingCart size={48} className={styles.emptyIcon} />
              <p>Your cart is empty.</p>
              <button 
                className={styles.continueShoppingBtn}
                onClick={() => setIsOpen(false)}
              >
                Continue Shopping
              </button>
            </div>
          ) : (
            <div className={styles.itemsList}>
              {items.map(item => (
                <CartItem key={item.cartItemId} item={item} />
              ))}
            </div>
          )}
        </div>

        {items.length > 0 && (
          <div className={styles.footer}>
            <div className={styles.summaryLine}>
              <span>Subtotal</span>
              <span className={styles.totalPrice}>{formatPrice(total)}</span>
            </div>
            <Link 
              to="/cart" 
              className={styles.checkoutBtn}
              onClick={() => setIsOpen(false)}
            >
              View Cart & Checkout
            </Link>
          </div>
        )}
      </div>
    </>
  )
}
