import React from 'react';
import { X, AlertTriangle } from 'lucide-react';
import { formatPrice } from '../../utils/formatPrice';
import styles from './DeleteProductModal.module.css';

export default function DeleteProductModal({ product, onConfirm, onCancel }) {
  if (!product) return null;

  const image = product.images && product.images.length > 0 ? product.images[0] : null;

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <div className={styles.titleContainer}>
            <AlertTriangle className={styles.warningIcon} size={24} />
            <h2>Delete Product</h2>
          </div>
          <button onClick={onCancel} className={styles.closeBtn}>
            <X size={24} />
          </button>
        </div>

        <div className={styles.content}>
          <p className={styles.message}>
            Are you sure you want to delete this product? This action will remove it from the public store and your admin dashboard.
          </p>

          <div className={styles.productCard}>
            {image ? (
              <img src={`${image}?w=100&q=auto&f=auto`} alt={product.name} className={styles.productImage} />
            ) : (
              <div className={styles.productImagePlaceholder} />
            )}
            <div className={styles.productInfo}>
              <h3>{product.name}</h3>
              <p className={styles.price}>{formatPrice(product.price)}</p>
              <p className={styles.stock}>Stock: {product.stock}</p>
              <p className={styles.category}>{product.category}</p>
            </div>
          </div>
        </div>

        <div className={styles.footer}>
          <button onClick={onCancel} className={styles.cancelBtn}>
            Cancel
          </button>
          <button onClick={() => onConfirm(product.id)} className={styles.deleteBtn}>
            Yes, Delete Product
          </button>
        </div>
      </div>
    </div>
  );
}
