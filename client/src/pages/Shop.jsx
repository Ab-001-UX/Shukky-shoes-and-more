import { useState } from 'react'
import { Search } from 'lucide-react'
import { useProducts } from '../hooks/useProducts'
import ProductGrid from '../components/product/ProductGrid'
import styles from './Shop.module.css'

const CATEGORY_FILTERS = [
  { label: 'All', value: '' },
  { label: 'Shoes', value: 'SHOES' },
  { label: 'Bags', value: 'BAGS' },
]

const TAG_FILTERS = [
  'Sandal', 'Heels', 'Flats',
  'Clutch', 'Work Bag', 'Party Bag', 'Tote', 'Crossbody',
]

export default function Shop() {
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState('')
  const [activeTag, setActiveTag] = useState('')

  const { products, isLoading, error, refetch } = useProducts(
    activeCategory || undefined,
    debouncedSearch,
    activeTag || undefined
  )

  const handleSearchSubmit = (e) => {
    e.preventDefault()
    setDebouncedSearch(search)
  }

  function handleTagClick(tag) {
    setActiveTag(prev => prev === tag ? '' : tag)
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Our Collection</h1>

        <form onSubmit={handleSearchSubmit} className={styles.searchForm}>
          <div className={styles.searchInputWrapper}>
            <Search size={20} className={styles.searchIcon} />
            <input
              type="text"
              placeholder="Search for shoes, bags..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={styles.searchInput}
            />
          </div>
          <button type="submit" className={styles.searchBtn}>Search</button>
        </form>

        <div className={styles.categoryBar}>
          {CATEGORY_FILTERS.map(cat => (
            <button
              key={cat.value}
              onClick={() => setActiveCategory(cat.value)}
              className={`${styles.filterChip} ${activeCategory === cat.value ? styles.activeChip : ''}`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        <div className={styles.tagBar}>
          {TAG_FILTERS.map(tag => (
            <button
              key={tag}
              onClick={() => handleTagClick(tag)}
              className={`${styles.tagChip} ${activeTag === tag ? styles.activeChip : ''}`}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      <div className="container">
        <ProductGrid
          products={products}
          isLoading={isLoading}
          error={error}
          refetch={refetch}
        />
      </div>
    </div>
  )
}
