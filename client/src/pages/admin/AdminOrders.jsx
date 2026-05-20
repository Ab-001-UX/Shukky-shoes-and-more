import { useState, useEffect } from 'react'
import { ChevronDown } from 'lucide-react'
import api from '../../lib/api'
import { formatPrice } from '../../utils/formatPrice'
import styles from './Admin.module.css'

export default function AdminOrders() {
  const [orders, setOrders] = useState([])
  const [isLoading, setIsLoading] = useState(true)

  const fetchOrders = async () => {
    try {
      const { data } = await api.get('/admin/orders')
      setOrders(data.data)
    } catch (err) {
      console.error('Failed to fetch orders', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchOrders()
  }, [])

  const updateStatus = async (id, payload) => {
    // Optimistic Update: Change the local state immediately for a "fast" feel
    const previousOrders = [...orders]
    setOrders(prev => prev.map(order => 
      order.id === id ? { ...order, ...payload } : order
    ))

    try {
      await api.patch(`/admin/orders/${id}`, payload)
      // fetchOrders() // No need to full refetch if optimistic was correct, but good to sync
    } catch (err) {
      setOrders(previousOrders) // Rollback on error
      alert('Failed to update status')
    }
  }

  if (isLoading) return <div className={styles.loading}>Loading orders...</div>

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Manage Orders</h1>
      
      <div className={styles.card}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Order ID</th>
              <th>Customer</th>
              <th>Products</th>
              <th>Date</th>
              <th>Payment Status</th>
              <th>Fulfillment</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            {orders.map(order => (
              <tr key={order.id}>
                <td>{order.id.slice(-6).toUpperCase()}</td>
                <td>
                  <div style={{ fontWeight: 600 }}>{order.deliveryDetails?.fullName || 'Guest'}</div>
                  <div style={{ fontSize: '12px', color: 'var(--color-muted)' }}>{order.deliveryDetails?.phone}</div>
                </td>
                <td>
                  {order.items?.map(item => (
                    <div key={item.id} style={{ fontSize: '13px' }}>
                      {item.product?.name} <span style={{ color: 'var(--color-muted)' }}>x{item.quantity}</span>
                    </div>
                  )) || 'No items'}
                </td>
                <td>{new Date(order.createdAt).toLocaleDateString()}</td>
                <td>
                  <div className={styles.selectWrapper}>
                    <select 
                      value={order.paymentStatus}
                      onChange={(e) => updateStatus(order.id, { paymentStatus: e.target.value })}
                      className={`${styles.statusSelect} ${order.paymentStatus === 'PENDING' && order.deliveryDetails?.paymentMethod === 'ON_DELIVERY' ? styles.select_INPERSON : styles[`select_${order.paymentStatus}`]}`}
                    >
                      <option value="PENDING">
                        {order.deliveryDetails?.paymentMethod === 'ON_DELIVERY' ? 'In-Person' : 'Pending'}
                      </option>
                      <option value="SUCCESS">Received</option>
                      <option value="FAILED">Not Received</option>
                    </select>
                    <ChevronDown className={styles.selectIcon} size={14} />
                  </div>
                </td>
                <td>
                  <div className={styles.selectWrapper}>
                    <select 
                      value={order.fulfillmentStatus}
                      onChange={(e) => updateStatus(order.id, { fulfillmentStatus: e.target.value })}
                      className={styles.fulfillmentSelect}
                    >
                      <option value="PENDING">Pending</option>
                      <option value="PROCESSING">Processing</option>
                      <option value="SHIPPED">Shipped</option>
                      <option value="DELIVERED">Delivered</option>
                    </select>
                    <ChevronDown className={`${styles.selectIcon} ${styles.darkIcon}`} size={14} />
                  </div>
                </td>
                <td style={{ fontWeight: 700 }}>{formatPrice(order.totalAmount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
