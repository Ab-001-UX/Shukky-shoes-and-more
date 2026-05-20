import { useState } from 'react'
import { ShoppingBag, RefreshCcw } from 'lucide-react'
import ProductCard from './ProductCard'
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
      <div className={styles.stateWrapper}>
        <div className={styles.spinner}></div>
        <p className={styles.stateMessage}>Loading products...</p>
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
