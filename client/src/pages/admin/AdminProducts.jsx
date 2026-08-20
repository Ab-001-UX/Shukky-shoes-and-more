import { useState, useEffect } from 'react'
import { Plus, ChevronDown } from 'lucide-react'
import api from '../../lib/api'
import { formatPrice } from '../../utils/formatPrice'
import { formatImageUrl } from '../../utils/formatImageUrl'
import ProductForm from '../../components/admin/ProductForm'
import DeleteProductModal from '../../components/admin/DeleteProductModal'
import styles from './Admin.module.css'

export default function AdminProducts() {
  const [products, setProducts] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingProduct, setEditingProduct] = useState(null)
  const [activeDropdown, setActiveDropdown] = useState(null)
  const [productToDelete, setProductToDelete] = useState(null)

  const fetchProducts = async () => {
    try {
      const { data } = await api.get('/admin/products')
      setProducts(data.data.filter(p => p.status !== 'ARCHIVED'))
    } catch (err) {
      console.error('Failed to fetch products', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchProducts()
  }, [])

  const handleEdit = (product) => {
    setEditingProduct(product)
    setShowForm(true)
  }

  const handleAddNew = () => {
    setEditingProduct(null)
    setShowForm(true)
  }

  const handleFormSuccess = () => {
    setShowForm(false)
    fetchProducts()
  }

  const handleDeleteConfirm = async (id) => {
    try {
      await api.delete(`/admin/products/${id}`);
      setProductToDelete(null);
      fetchProducts();
    } catch (err) {
      console.error('Failed to delete product', err);
      alert(err.response?.data?.message || 'Failed to delete product');
    }
  }

  if (isLoading) return <div className={styles.loading}>Loading products...</div>

  return (
    <div className={styles.page}>
      <div className={styles.headerRow}>
        <h1 className={styles.title} style={{ marginBottom: 0 }}>Products</h1>
        <button className={styles.primaryBtn} onClick={handleAddNew}>
          <Plus size={20} /> Add Product
        </button>
      </div>
      
      <div className={styles.card}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Image</th>
              <th>Name</th>
              <th>Price</th>
              <th>Stock</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.map(product => (
              <tr key={product.id}>
                <td>
                  <img 
                    src={formatImageUrl(product.images?.[0], 50)} 
                    alt={product.name} 
                    style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '4px' }}
                  />
                </td>
                <td>{product.name}</td>
                <td>{formatPrice(product.price)}</td>
                <td>{product.stock}</td>
                <td>
                  <span className={`${styles.badge} ${product.status === 'ACTIVE' ? styles.badge_SUCCESS : styles.badge_FAILED}`}>
                    {product.status}
                  </span>
                </td>
                <td>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <button 
                      onClick={() => handleEdit(product)}
                      style={{ border: 'none', background: 'transparent', color: 'var(--color-accent)', cursor: 'pointer', fontWeight: 600, padding: '4px 8px 4px 0' }}
                    >
                      Edit
                    </button>
                    <button 
                      onClick={() => setActiveDropdown(activeDropdown === product.id ? null : product.id)}
                      style={{ border: 'none', background: 'transparent', color: 'var(--color-primary)', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center', borderRadius: '4px' }}
                      title="More actions"
                    >
                      <ChevronDown size={16} />
                    </button>
                    
                    {activeDropdown === product.id && (
                      <div style={{
                        position: 'absolute',
                        right: '0',
                        top: '100%',
                        backgroundColor: 'var(--color-card)',
                        border: '1px solid var(--color-border)',
                        borderRadius: '8px',
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                        padding: '4px',
                        zIndex: 50,
                        minWidth: '130px'
                      }}>
                        <button 
                          onClick={() => {
                            setProductToDelete(product)
                            setActiveDropdown(null)
                          }}
                          style={{ 
                            border: 'none', 
                            background: 'transparent', 
                            color: 'var(--color-error)', 
                            cursor: 'pointer', 
                            fontWeight: 500,
                            width: '100%',
                            textAlign: 'left',
                            padding: '8px 12px',
                            borderRadius: '4px'
                          }}
                        >
                          Delete Product
                        </button>
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showForm && (
        <ProductForm 
          product={editingProduct} 
          onSuccess={handleFormSuccess}
          onCancel={() => setShowForm(false)}
        />
      )}

      {productToDelete && (
        <DeleteProductModal 
          product={productToDelete}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setProductToDelete(null)}
        />
      )}
    </div>
  )
}
