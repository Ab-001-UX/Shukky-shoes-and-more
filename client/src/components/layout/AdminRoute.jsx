import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import AdminHeader from '../admin/AdminHeader'
import styles from './AdminRoute.module.css'

export default function AdminRoute() {
  const { isAuthenticated, user, isLoading } = useAuthStore()

  if (isLoading) return <div>Loading...</div>

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (user?.role !== 'ADMIN') {
    return <Navigate to="/" replace />
  }

  return (
    <div className={styles.adminLayout}>
      <AdminHeader />
      <div className={styles.adminContent}>
        <Outlet />
      </div>
    </div>
  )
}
