import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import api from '../../lib/api'
import { formatPrice } from '../../utils/formatPrice'
import styles from './Admin.module.css'

export default function AdminDashboard() {
  const [orders, setOrders] = useState([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
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
    fetchOrders()
  }, [])

  if (isLoading) return <div className={styles.loading}>Loading dashboard...</div>

  const successfulOrders = orders.filter(o => o.paymentStatus === 'SUCCESS')
  const totalRevenue = successfulOrders.reduce((sum, o) => sum + o.totalAmount, 0)
  const pendingFulfillment = successfulOrders.filter(o => o.fulfillmentStatus === 'PENDING').length

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Dashboard</h1>
      
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <h3>Total Revenue</h3>
          <p className={styles.statValue}>{formatPrice(totalRevenue)}</p>
        </div>
        <div className={styles.statCard}>
          <h3>Orders to Fulfill</h3>
          <p className={styles.statValue}>{pendingFulfillment}</p>
        </div>
        <div className={styles.statCard}>
          <h3>Total Orders</h3>
          <p className={styles.statValue}>{orders.length}</p>
        </div>
      </div>

      <div className={styles.quickActions}>
        <Link to="/admin/orders" className={styles.actionBtn}>Manage Orders</Link>
        <Link to="/admin/products" className={styles.actionBtn}>Manage Products</Link>
        <Link to="/admin/inventory" className={styles.actionBtn}>Inventory</Link>
        <Link to="/admin/policies" className={styles.actionBtn}>Edit Policies</Link>
      </div>

      <div className={styles.card}>
        <h2 className={styles.cardTitle}>Recent Orders</h2>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Order ID</th>
              <th>Customer</th>
              <th>Date</th>
              <th>Status</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            {orders.slice(0, 10).map(order => (
              <tr key={order.id}>
                <td>{order.id.slice(-6)}</td>
                <td>{order.deliveryDetails?.fullName || order.user?.name || 'Guest'}</td>
                <td>{new Date(order.createdAt).toLocaleDateString()}</td>
                <td>
                  <span className={`${styles.badge} ${styles[`badge_${order.paymentStatus}`]}`}>
                    {order.paymentStatus}
                  </span>
                </td>
                <td>{formatPrice(order.totalAmount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
