import { Link, Navigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import styles from './Welcome.module.css'

export default function Welcome() {
  const { isAuthenticated, user } = useAuthStore()

  // If already logged in, skip the welcome screen
  if (isAuthenticated) {
    return <Navigate to={user?.role === 'ADMIN' ? '/admin/dashboard' : '/'} replace />
  }

  return (
    <div className={styles.container}>
      <div className={styles.overlay} />
      
      <div className={styles.content}>
        <div className={styles.brand}>
          <h1 className={styles.logo}>Shukky Shoes</h1>
          <p className={styles.tagline}>& More</p>
        </div>

        <div className={styles.heroText}>
          <h2 className={styles.title}>Luxury in Every Step.</h2>
          <p className={styles.subtitle}>
            Experience the finest collection of premium footwear and elegant bags.
          </p>
        </div>

        <div className={styles.actions}>
          <Link to="/login" className={styles.signInBtn}>
            Sign In
          </Link>
          <Link to="/register" className={styles.signUpBtn}>
            Create Account
          </Link>
        </div>
      </div>

      <div className={styles.footer}>
        <p>© 2026 Shukky Shoes & More. All rights reserved.</p>
      </div>
    </div>
  )
}
