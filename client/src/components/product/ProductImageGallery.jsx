import { useState } from 'react'
import styles from './ProductImageGallery.module.css'

export default function ProductImageGallery({ images, name }) {
  const [activeIndex, setActiveIndex] = useState(0)

  if (!images || images.length === 0) {
    return (
      <div className={styles.emptyGallery}>
        <p>No images available</p>
      </div>
    )
  }

  return (
    <div className={styles.gallery}>
      <div className={styles.mainImageContainer}>
        <img
          src={`${images[activeIndex]}?w=800&q=auto&f=auto`}
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
                src={`${img}?w=150&q=auto&f=auto`}
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
