import { useParams, Link, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { ArrowLeft, ShoppingCart, Zap, ShieldCheck, Info, Share2 } from 'lucide-react'
import { useProduct } from '../hooks/useProducts'
import { usePolicies } from '../hooks/usePolicies'
import { useCartStore } from '../store/cartStore'
import { useToastStore } from '../store/toastStore'
import ProductImageGallery from '../components/product/ProductImageGallery'
import { formatPrice } from '../utils/formatPrice'
import styles from './ProductDetail.module.css'

export default function ProductDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { product, isLoading: productLoading, error: productError } = useProduct(id)
  const { policies, isLoading: policiesLoading } = usePolicies()
  
  const [isAdding, setIsAdding] = useState(false)
  const [isBuying, setIsBuying] = useState(false)
  const [selectedColor, setSelectedColor] = useState(null)
  const [selectedSize, setSelectedSize] = useState(null)
  const [sizeHint, setSizeHint] = useState(null)
  const [agreedToPolicies, setAgreedToPolicies] = useState(false)
  
  const addItem = useCartStore(state => state.addItem)
  const showToast = useToastStore(state => state.showToast)

  useEffect(() => {
    if (product?.colors?.length === 1) {
      setSelectedColor(product.colors[0])
    }
  }, [product])

  if (productLoading || policiesLoading) {
    return (
      <div className={styles.stateWrapper}>
        <div className={styles.spinner}></div>
      </div>
    )
  }

  if (productError || !product) {
    return (
      <div className={styles.stateWrapper}>
        <p className={styles.stateMessage}>{productError || 'Product not found'}</p>
        <Link to="/shop" className={styles.backButton}>Back to Shop</Link>
      </div>
    )
  }

  const isOutOfStock = product.stock === 0 || product.status === 'OUT_OF_STOCK'
  const hasColors = product.colors && product.colors.length > 0
  const isShoe = product.category === 'SHOES'
  const hasSizes = isShoe && product.availableSizes && product.availableSizes.length > 0

  const needsColor = hasColors && !selectedColor && product.colors.length > 1
  const needsSize = hasSizes && !selectedSize
  const needsAgreement = !agreedToPolicies
  
  const canAdd = !isOutOfStock && !needsColor && !needsSize && !needsAgreement

  function getCTALabel(isProcessing) {
    if (isOutOfStock) return 'Out of Stock'
    if (needsColor) return 'Select a Color'
    if (needsSize) return 'Select a Size'
    if (needsAgreement) return 'Agree to Policies'
    if (isProcessing) return 'Processing...'
    return null
  }

  function handleUnavailableSizeClick(size) {
    setSizeHint(`Size ${size} is unavailable`)
    setTimeout(() => setSizeHint(null), 2500)
  }

  async function handleAddToCart() {
    if (!canAdd) return
    setIsAdding(true)
    addItem({ ...product, selectedColor, selectedSize })
    showToast(`"${product.name}" has been added to your cart.`, 'cart')
    setTimeout(() => setIsAdding(false), 500)
  }

  async function handleBuyNow() {
    if (!canAdd) return
    setIsBuying(true)
    addItem({ ...product, selectedColor, selectedSize })
    setTimeout(() => {
      setIsBuying(false)
      navigate('/checkout')
    }, 300)
  }

  async function handleShare() {
    if (navigator.share) {
      try {
        await navigator.share({
          title: product.name,
          text: `Check out ${product.name} on Shukky Shoes & More!`,
          url: window.location.href,
        })
      } catch (err) {
        // User cancelled or error
      }
    } else {
      // Fallback: Copy link to clipboard
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(window.location.href)
          showToast('Link copied to clipboard!')
        } else {
          // Fallback for non-secure contexts (HTTP on mobile)
          const textArea = document.createElement('textarea')
          textArea.value = window.location.href
          document.body.appendChild(textArea)
          textArea.select()
          document.execCommand('copy')
          document.body.removeChild(textArea)
          showToast('Link copied to clipboard!')
        }
      } catch (err) {
        showToast('Failed to copy link.')
      }
    }
  }

  return (
    <div className="container">
      <div className={styles.page}>
        <Link to="/shop" className={styles.backLink}>
          <ArrowLeft size={20} />
          Back to Shop
        </Link>

        <div className={styles.content}>
          <div className={styles.gallerySection}>
            <ProductImageGallery images={product.images} name={product.name} />
          </div>

          <div className={styles.detailsSection}>
            {isOutOfStock && <span className={styles.soldOutBadge}>Sold Out</span>}
            <div className={styles.nameHeader}>
              <h1 className={styles.name}>{product.name}</h1>
              <button 
                onClick={handleShare} 
                className={styles.shareBtn}
                title="Share product"
              >
                <Share2 size={24} />
              </button>
            </div>
            <p className={styles.price}>{formatPrice(product.price)}</p>

            <div className={styles.description}>
              <h3>Description</h3>
              <p>{product.description}</p>
            </div>

            {hasColors && product.colors.length > 1 && (
              <div className={styles.colorsSection}>
                <h3>Color{selectedColor ? `: ${selectedColor}` : ''}</h3>
                <div className={styles.colorOptions}>
                  {product.colors.map(color => (
                    <button
                      key={color}
                      className={`${styles.colorOption} ${selectedColor === color ? styles.selected : ''}`}
                      onClick={() => setSelectedColor(color)}
                    >
                      {color}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {hasSizes && (
              <div className={styles.sizesSection}>
                <h3>Size{selectedSize ? `: EU ${selectedSize}` : ' (EU)'}</h3>
                <div className={styles.sizeOptions}>
                  {product.availableSizes.map(size => {
                    const isUnavailable = product.unavailableSizes?.includes(size)
                    const isSelected = selectedSize === size
                    return (
                      <button
                        key={size}
                        onClick={() => isUnavailable ? handleUnavailableSizeClick(size) : setSelectedSize(size)}
                        className={`${styles.sizeOption} ${isSelected ? styles.sizeSelected : ''} ${isUnavailable ? styles.sizeUnavailable : ''}`}
                      >
                        {size}
                      </button>
                    )
                  })}
                </div>
                {sizeHint && <p className={styles.sizeHint}>{sizeHint}</p>}
              </div>
            )}

            {/* Policy Summary & Mandatory Agreement */}
            <div className={styles.policySummary}>
              <div className={styles.policyHeader}>
                <ShieldCheck size={18} className={styles.policyIcon} />
                <h3>Store Policies</h3>
              </div>
              <div className={styles.policyRules}>
                <div className={styles.rule}>
                  <Info size={14} />
                  <span>No returns or complaints after 48 hours of purchase.</span>
                </div>
                <div className={styles.rule}>
                  <Info size={14} />
                  <span>No exchange or stockpiling. Items must move immediately.</span>
                </div>
                <div className={styles.rule}>
                  <Info size={14} />
                  <span>No replacement for items returned with damage.</span>
                </div>
              </div>
              
              <label className={styles.agreementCheckbox}>
                <input 
                  type="checkbox" 
                  checked={agreedToPolicies} 
                  onChange={(e) => setAgreedToPolicies(e.target.checked)}
                />
                <span>I have read and agree to all store policies.</span>
              </label>
              
              <Link to="/info" className={styles.viewFullPolicies}>View Full Policies</Link>
            </div>

            <div className={styles.ctaGroup}>
              <button
                onClick={handleBuyNow}
                disabled={!canAdd || isBuying}
                className={styles.buyNowButton}
              >
                <Zap size={20} />
                {getCTALabel(isBuying) || 'Buy Now'}
              </button>

              <button
                onClick={handleAddToCart}
                disabled={!canAdd || isAdding}
                className={styles.addButton}
              >
                <ShoppingCart size={20} />
                {isAdding ? 'Added!' : 'Add to Cart'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
