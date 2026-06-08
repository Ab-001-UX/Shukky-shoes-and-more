import { useState } from 'react'
import { ShoppingBag, RefreshCcw } from 'lucide-react'
import ProductCard from './ProductCard'
import Skeleton from '../ui/Skeleton'
import styles from './ProductGrid.module.css'

export default function ProductGrid({ products, isLoading, error, refetch, onAddToCart }) {
  const [isRolling, setIsRolling] = useState(false)

  async function handleRetry() {
    setIsRolling(true)
    await refetch()
    setIsRolling(false)
  }

  if (isLoading) {
    return (
      <div className={styles.grid}>
        {Array.from({ length: 8 }).map((_, idx) => (
          <div key={idx} className={styles.skeletonCard}>
            <Skeleton variant="image" className={styles.skeletonImage} />
            <div className={styles.skeletonInfo}>
              <Skeleton variant="text" width="80%" className={styles.skeletonName} />
              <Skeleton variant="text" width="50%" className={styles.skeletonPrice} />
              <Skeleton variant="text" width="60%" className={styles.skeletonLink} />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className={styles.stateWrapper}>
        <p className={styles.stateMessage}>{error}</p>
        <button onClick={handleRetry} className={styles.retryButton}>
          <RefreshCcw size={18} className={isRolling ? styles.rolling : ''} />
          Try again
        </button>
      </div>
    )
  }

  if (!products || products.length === 0) {
    return (
      <div className={styles.stateWrapper}>
        <ShoppingBag className={styles.stateIcon} size={48} />
        <p className={styles.stateMessage}>No products found.</p>
      </div>
    )
  }

  return (
    <div className={styles.grid}>
      {products.map(product => (
        <ProductCard key={product.id} product={product} onAddToCart={onAddToCart} />
      ))}
    </div>
  )
}
