import { CheckCircle, X, ShoppingBag } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useToastStore } from '../../store/toastStore'
import styles from './Toast.module.css'

export default function Toast() {
  const { toasts, dismissToast } = useToastStore()

  if (toasts.length === 0) return null

  return (
    <div className={styles.container}>
      {toasts.map(toast => (
        <div key={toast.id} className={styles.toast}>
          <CheckCircle size={20} className={styles.icon} />
          <div className={styles.body}>
            <p className={styles.message}>{toast.message}</p>
            {toast.type === 'cart' && (
              <Link to="/cart" className={styles.cartLink} onClick={() => dismissToast(toast.id)}>
                <ShoppingBag size={14} />
                Go to cart
              </Link>
            )}
          </div>
          <button
            className={styles.closeBtn}
            onClick={() => dismissToast(toast.id)}
            aria-label="Dismiss"
          >
            <X size={16} />
          </button>
        </div>
      ))}
    </div>
  )
}
