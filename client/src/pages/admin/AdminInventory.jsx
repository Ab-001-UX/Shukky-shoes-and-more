import { useState, useEffect } from 'react'
import api from '../../lib/api'
import styles from './Admin.module.css'

export default function AdminInventory() {
  const [products, setProducts] = useState([])
  const [isLoading, setIsLoading] = useState(true)

  const fetchProducts = async () => {
    try {
      const { data } = await api.get('/admin/inventory')
      setProducts(data.data)
    } catch (err) {
      console.error('Failed to fetch products', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchProducts()
  }, [])

  const updateStock = async (id, newStock) => {
    try {
      await api.patch(`/admin/inventory/${id}`, { stock: parseInt(newStock, 10) })
      setProducts(products.map(p => p.id === id ? { ...p, stock: parseInt(newStock, 10) } : p))
    } catch (err) {
      alert('Failed to update stock')
      fetchProducts()
    }
  }

  if (isLoading) return <div className={styles.loading}>Loading inventory...</div>

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Inventory Management</h1>
      
      <div className={styles.card}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Name</th>
              <th>Status</th>
              <th>Current Stock</th>
              <th>Update Stock</th>
            </tr>
          </thead>
          <tbody>
            {products.map(product => (
              <tr key={product.id}>
                <td>{product.name}</td>
                <td>
                  <span className={`${styles.badge} ${product.status === 'ACTIVE' ? styles.badge_SUCCESS : styles.badge_FAILED}`}>
                    {product.status}
                  </span>
                </td>
                <td>{product.stock}</td>
                <td>
                  <input 
                    type="number" 
                    defaultValue={product.stock}
                    onBlur={(e) => {
                      if (e.target.value !== String(product.stock)) {
                        updateStock(product.id, e.target.value)
                      }
                    }}
                    style={{ 
                      width: '80px', 
                      padding: '4px 8px', 
                      borderRadius: '4px', 
                      border: '1px solid var(--color-border)' 
                    }}
                    min="0"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
