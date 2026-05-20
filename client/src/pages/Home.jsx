import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { useProducts } from '../hooks/useProducts'
import { useAuthStore } from '../store/authStore'
import ProductGrid from '../components/product/ProductGrid'
import styles from './Home.module.css'

export default function Home() {
  const { products, isLoading, error } = useProducts(undefined, undefined, undefined, 12)
  const { isAuthenticated } = useAuthStore()

  const targetPath = isAuthenticated ? '/shop' : '/login'

  // Newest 4 products = New Collection
  const newCollection = products?.slice(0, 4) ?? []
  // Next 4 products = Shop section
  const shopProducts = products?.slice(4, 8) ?? []

  return (
    <div>
      <section className={styles.hero}>
        <div className="container">
          <div className={styles.heroContent}>
            <h1 className={styles.heroTitle}>Luxury in Every Step.</h1>
            <p className={styles.heroSubtitle}>
              Elevate your style with our exclusive collection of sophisticated footwear and elegant bags, meticulously curated for the feminine and the bold.
            </p>
            <Link to={targetPath} className={styles.heroButton}>
              Shop Collection <ArrowRight size={20} />
            </Link>
          </div>
        </div>
      </section>

      {/* New Collection section */}
      <section className={styles.featured}>
        <div className="container">
          <div className={styles.sectionHeader}>
            <div className={styles.sectionMeta}>
              <span className={styles.sectionBadge}>Just Arrived</span>
              <h2 className={styles.sectionTitle}>New Collection</h2>
            </div>
            <Link to={targetPath} className={styles.viewAllLink}>
              View All <ArrowRight size={16} />
            </Link>
          </div>

          <ProductGrid
            products={newCollection}
            isLoading={isLoading}
            error={error}
          />
        </div>
      </section>

      {/* Shop section — only show if there are older products */}
      {!isLoading && shopProducts.length > 0 && (
        <section className={styles.shopSection}>
          <div className="container">
            <div className={styles.sectionHeader}>
              <div className={styles.sectionMeta}>
                <span className={styles.sectionBadge}>Keep Exploring</span>
                <h2 className={styles.sectionTitle}>Shop</h2>
              </div>
              <Link to={targetPath} className={styles.viewAllLink}>
                See More <ArrowRight size={16} />
              </Link>
            </div>

            <ProductGrid
              products={shopProducts}
              isLoading={false}
              error={null}
            />
          </div>
        </section>
      )}
    </div>
  )
}
