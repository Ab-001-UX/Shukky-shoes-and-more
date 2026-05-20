import { useState } from 'react'
import { X } from 'lucide-react'
import api from '../../lib/api'
import ImageUploader from './ImageUploader'
import styles from './ProductForm.module.css'

const SHOE_SIZES = ['36', '37', '38', '39', '40', '41', '42', '43', '44', '45']

const CATEGORY_TAGS = {
  BAGS: ['Clutch', 'Party Bag', 'Work Bag', 'Tote', 'Crossbody'],
  SHOES: ['Sandal', 'Heels', 'Flats'],
}

export default function ProductForm({ product, onSuccess, onCancel }) {
  const [formData, setFormData] = useState({
    name: product?.name || '',
    price: product?.price ? product.price / 100 : '',
    description: product?.description || '',
    category: product?.category || 'SHOES',
    stock: product?.stock || 0,
    status: product?.status || 'ACTIVE',
    colors: product?.colors ? product.colors.join(', ') : '',
  })

  const [selectedTags, setSelectedTags] = useState(product?.tags || [])
  // availableSizes: sizes the shoe comes in
  const [availableSizes, setAvailableSizes] = useState(product?.availableSizes || [])
  // unavailableSizes: subset of availableSizes that are out of stock
  const [unavailableSizes, setUnavailableSizes] = useState(product?.unavailableSizes || [])
  const [images, setImages] = useState(product?.images || [])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState(null)

  const availableTags = CATEGORY_TAGS[formData.category] || []
  const isShoe = formData.category === 'SHOES'

  const handleChange = (e) => {
    const { name, value } = e.target
    if (name === 'category') {
      setSelectedTags([])
      setAvailableSizes([])
      setUnavailableSizes([])
    }
    setFormData({ ...formData, [name]: value })
  }

  function handleTagToggle(tag) {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    )
  }

  function handleSizeToggle(size) {
    if (availableSizes.includes(size)) {
      // Remove the size entirely — also remove from unavailable
      setAvailableSizes(prev => prev.filter(s => s !== size))
      setUnavailableSizes(prev => prev.filter(s => s !== size))
    } else {
      setAvailableSizes(prev => [...prev, size])
    }
  }

  function handleUnavailableToggle(size) {
    if (!availableSizes.includes(size)) return // Can't mark a size unavailable if it's not in the range
    setUnavailableSizes(prev =>
      prev.includes(size) ? prev.filter(s => s !== size) : [...prev, size]
    )
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setIsSubmitting(true)

    try {
      const payload = {
        ...formData,
        price: Math.round(Number(formData.price) * 100),
        images,
        colors: formData.colors ? formData.colors.split(',').map(c => c.trim()).filter(Boolean) : [],
        tags: selectedTags,
        availableSizes,
        unavailableSizes,
        stock: Number(formData.stock)
      }

      if (product) {
        await api.patch(`/admin/products/${product.id}`, payload)
      } else {
        await api.post('/admin/products', payload)
      }

      onSuccess()
    } catch (err) {
      setError(err.message || 'Failed to save product')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <h2>{product ? 'Edit Product' : 'New Product'}</h2>
          <button onClick={onCancel} className={styles.closeBtn}><X size={24} /></button>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          {error && <div className={styles.error}>{error}</div>}

          <div className={styles.formGroup}>
            <label>Images (Cloudinary)</label>
            <ImageUploader images={images} onChange={setImages} />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="name">Product Name *</label>
            <input id="name" name="name" required value={formData.name} onChange={handleChange} className={styles.input} />
          </div>

          <div className={styles.row}>
            <div className={styles.formGroup}>
              <label htmlFor="price">Price (₦) *</label>
              <input id="price" name="price" type="number" required min="0" step="0.01" value={formData.price} onChange={handleChange} className={styles.input} />
            </div>
            <div className={styles.formGroup}>
              <label htmlFor="stock">Stock *</label>
              <input id="stock" name="stock" type="number" required min="0" value={formData.stock} onChange={handleChange} className={styles.input} />
            </div>
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="colors">Available Colors (comma-separated)</label>
            <input id="colors" name="colors" type="text" placeholder="e.g. Red, Black, Gold" value={formData.colors} onChange={handleChange} className={styles.input} />
          </div>

          <div className={styles.row}>
            <div className={styles.formGroup}>
              <label htmlFor="category">Category *</label>
              <select id="category" name="category" value={formData.category} onChange={handleChange} className={styles.input}>
                <option value="SHOES">Shoes</option>
                <option value="BAGS">Bags</option>
              </select>
            </div>
            <div className={styles.formGroup}>
              <label htmlFor="status">Status *</label>
              <select id="status" name="status" value={formData.status} onChange={handleChange} className={styles.input}>
                <option value="ACTIVE">Active</option>
                <option value="OUT_OF_STOCK">Out of Stock</option>
                <option value="ARCHIVED">Archived</option>
              </select>
            </div>
          </div>

          {/* Shoe sizes section */}
          {isShoe && (
            <div className={styles.formGroup}>
              <label>
                Available Sizes
                <span className={styles.labelHint}> — click to add, click ✕ icon to mark out of stock</span>
              </label>
              <div className={styles.tagChips}>
                {SHOE_SIZES.map(size => {
                  const isSelected = availableSizes.includes(size)
                  const isUnavailable = unavailableSizes.includes(size)
                  return (
                    <div key={size} className={styles.sizeChipWrapper}>
                      <button
                        type="button"
                        onClick={() => handleSizeToggle(size)}
                        className={`${styles.sizeChip} ${isSelected ? (isUnavailable ? styles.sizeChipUnavailable : styles.sizeChipActive) : ''}`}
                      >
                        {size}
                      </button>
                      {isSelected && (
                        <button
                          type="button"
                          title={isUnavailable ? 'Mark as available' : 'Mark as out of stock'}
                          onClick={() => handleUnavailableToggle(size)}
                          className={`${styles.sizeStockToggle} ${isUnavailable ? styles.sizeStockToggleOut : ''}`}
                        >
                          {isUnavailable ? '✕' : '✓'}
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
              {availableSizes.length > 0 && (
                <p className={styles.tagHint}>
                  <strong>Selected:</strong> {availableSizes.join(', ')}
                  {unavailableSizes.length > 0 && ` · Out of stock: ${unavailableSizes.join(', ')}`}
                </p>
              )}
            </div>
          )}

          {/* Tag chips per category */}
          {availableTags.length > 0 && (
            <div className={styles.formGroup}>
              <label>
                {formData.category === 'BAGS' ? 'Bag Type' : 'Shoe Type'}
                <span className={styles.labelHint}> (select all that apply)</span>
              </label>
              <div className={styles.tagChips}>
                {availableTags.map(tag => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => handleTagToggle(tag)}
                    className={`${styles.tagChip} ${selectedTags.includes(tag) ? styles.tagChipActive : ''}`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className={styles.formGroup}>
            <label htmlFor="description">Description *</label>
            <textarea id="description" name="description" required rows="4" value={formData.description} onChange={handleChange} className={styles.textarea} />
          </div>

          <div className={styles.actions}>
            <button type="button" onClick={onCancel} className={styles.cancelBtn}>Cancel</button>
            <button type="submit" disabled={isSubmitting} className={styles.saveBtn}>
              {isSubmitting ? 'Saving...' : 'Save Product'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
