import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ShoppingCart, ArrowRight } from 'lucide-react'
import { formatPrice } from '../../utils/formatPrice'
import { formatImageUrl } from '../../utils/formatImageUrl'
import { useCartStore } from '../../store/cartStore'
import { useToastStore } from '../../store/toastStore'
import styles from './ProductCard.module.css'

export default function ProductCard({ product }) {
  const [adding, setAdding] = useState(false)
  const navigate = useNavigate()
  const addItem = useCartStore(state => state.addItem)
  const showToast = useToastStore(state => state.showToast)

  const isOutOfStock = product.stock === 0 || product.status === 'OUT_OF_STOCK'
  const hasMultipleColors = product.colors && product.colors.length > 1
  const rawCoverImage = product.images?.[0]
  const coverImage = formatImageUrl(rawCoverImage, 400)

  function handleCartClick(e) {
    // Prevent the image link from firing
    e.preventDefault()
    e.stopPropagation()

    if (isOutOfStock) return

    // Single color or no color — add directly to cart
    const selectedColor = product.colors?.length > 0 ? product.colors[0] : null
    setAdding(true)
    addItem({ ...product, selectedColor })
    showToast(`"${product.name}" has been added to your cart`)
    setTimeout(() => setAdding(false), 800)
  }

  return (
    <div className={`${styles.card} ${isOutOfStock ? styles.outOfStock : ''}`}>
      <Link to={`/product/${product.id}`} className={styles.imageLink}>
        <div className={styles.imageContainer}>
          <img
            src={coverImage}
            alt={product.name}
            loading="lazy"
            className={styles.image}
            style={{ filter: isOutOfStock ? 'grayscale(100%)' : 'none' }}
          />
          {isOutOfStock && <span className={styles.soldOutBadge}>Sold Out</span>}
          {!isOutOfStock && (
            <button
              className={`${styles.cartIconOverlay} ${adding ? styles.adding : ''}`}
              onClick={handleCartClick}
              aria-label={`Add ${product.name} to cart`}
            >
              <ShoppingCart size={14} />
            </button>
          )}
        </div>
      </Link>

      <div className={styles.info}>
        <h3 className={styles.name}>{product.name}</h3>
        <p className={styles.price}>{formatPrice(product.price)}</p>
        {product.description && (
          <p className={styles.descriptionPreview}>
            {product.description}
          </p>
        )}
        <Link to={`/product/${product.id}`} className={styles.viewLink}>
          View Product <ArrowRight size={14} />
        </Link>
      </div>
    </div>
  )
}
}
