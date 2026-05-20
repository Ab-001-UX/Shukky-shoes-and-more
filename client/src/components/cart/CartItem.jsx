import { Minus, Plus, Trash2 } from 'lucide-react'
import { formatPrice } from '../../utils/formatPrice'
import { useCartStore } from '../../store/cartStore'
import styles from './CartItem.module.css'

export default function CartItem({ item }) {
  const { updateQuantity, removeItem } = useCartStore()
  const coverImage = item.images?.[0] || 'https://via.placeholder.com/150?text=No+Image'

  return (
    <div className={styles.cartItem}>
      <img src={`${coverImage}?w=150&q=auto&f=auto`} alt={item.name} className={styles.image} />
      
      <div className={styles.details}>
        <h4 className={styles.name}>{item.name}</h4>
        {item.selectedColor && <p className={styles.colorLabel}>Color: {item.selectedColor}</p>}
        <p className={styles.price}>{formatPrice(item.price)}</p>
        
        <div className={styles.actions}>
          <div className={styles.quantityControls}>
            <button 
              className={styles.qtyBtn} 
              onClick={() => updateQuantity(item.cartItemId, -1)}
              disabled={item.quantity <= 1}
            >
              <Minus size={14} />
            </button>
            <span className={styles.quantity}>{item.quantity}</span>
            <button 
              className={styles.qtyBtn} 
              onClick={() => updateQuantity(item.cartItemId, 1)}
            >
              <Plus size={14} />
            </button>
          </div>
          
          <button 
            className={styles.removeBtn} 
            onClick={() => removeItem(item.cartItemId)}
            aria-label="Remove item"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>
    </div>
  )
}
