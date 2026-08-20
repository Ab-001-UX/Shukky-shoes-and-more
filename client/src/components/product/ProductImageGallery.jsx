import { useState } from 'react'
import { formatImageUrl } from '../../utils/formatImageUrl'
import styles from './ProductImageGallery.module.css'

export default function ProductImageGallery({ images, name }) {
  const [activeIndex, setActiveIndex] = useState(0)

  if (!images || images.length === 0) {
    return (
      <div className={styles.emptyGallery}>
        <img
          src={formatImageUrl(null, 800)}
          alt={name || 'No image'}
          className={styles.mainImage}
        />
      </div>
    )
  }

  const mainImageUrl = formatImageUrl(images[activeIndex], 800)

  return (
    <div className={styles.gallery}>
      <div className={styles.mainImageContainer}>
        <img
          src={mainImageUrl}
          alt={`${name} - Image ${activeIndex + 1}`}
          className={styles.mainImage}
        />
      </div>
      
      {images.length > 1 && (
        <div className={styles.thumbnailList}>
          {images.map((img, index) => (
            <button
              key={index}
              onClick={() => setActiveIndex(index)}
              className={`${styles.thumbnailButton} ${index === activeIndex ? styles.active : ''}`}
            >
              <img
                src={formatImageUrl(img, 150)}
                alt={`Thumbnail ${index + 1}`}
                className={styles.thumbnailImage}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
