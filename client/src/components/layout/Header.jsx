import { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { ShoppingBag, ShoppingCart, Info, LogOut, ArrowLeft, Eye, Home, Truck } from 'lucide-react'
import { useCartStore } from '../../store/cartStore'
import { useAuthStore } from '../../store/authStore'
import api from '../../lib/api'
import LogoutModal from './LogoutModal'
import styles from './Header.module.css'

export default function Header() {
  const { setIsOpen, items } = useCartStore()
  const { pathname } = useLocation()
  const { isAuthenticated, user, logout } = useAuthStore()
  const [showLogoutModal, setShowLogoutModal] = useState(false)
  const [hasActiveOrder, setHasActiveOrder] = useState(false)
  
  useEffect(() => {
    const checkActiveOrder = async () => {
      // 1. Try server for logged in users
      if (isAuthenticated) {
        try {
          const { data: recentData } = await api.get('/orders/recent/mine')
          if (recentData.data && recentData.data.fulfillmentStatus !== 'DELIVERED') {
            setHasActiveOrder(true)
            return
          }
        } catch (e) {}
      }
      
      // 2. Try localStorage for guests or if server fails
      const orderId = localStorage.getItem('shukky_last_order_id')
      if (orderId) {
        try {
          const { data } = await api.get(`/orders/${orderId}`)
          if (data.data && data.data.fulfillmentStatus !== 'DELIVERED') {
            setHasActiveOrder(true)
          }
        } catch (e) {}
      }
    }
    checkActiveOrder()
  }, [isAuthenticated, pathname])

  const count = items.reduce((sum, i) => sum + i.quantity, 0)
  const navigate = useNavigate()

  const handleLogoutConfirm = async () => {
    await logout()
    setShowLogoutModal(false)
    navigate('/')
  }

  const isAdmin = user?.role === 'ADMIN'

  return (
    <>
      {/* Admin storefront preview bar */}
      {isAdmin && (
        <div className={styles.adminPreviewBar}>
          <span className={styles.adminText}>
            Viewing storefront as Admin
          </span>
          <Link to="/admin/dashboard" className={styles.backToAdminLink}>
            <ArrowLeft size={14} /> Back to Admin Dashboard
          </Link>
        </div>
      )}

      <header className={styles.header}>
        <div className={styles.headerContainer}>
          <Link to="/" className={styles.logo}>
            Shukky Shoes
          </Link>

          <div className={styles.mobileRightActions}>
            {isAuthenticated && !isAdmin && (
              <button onClick={() => setShowLogoutModal(true)} className={`${styles.iconBtn} ${styles.logoutBtnRed}`} title="Log Out">
                <LogOut size={20} className={styles.logoutIcon} />
                <span className={`${styles.iconLabel} ${styles.iconLabelRed}`}>Exit</span>
              </button>
            )}
          </div>

          <nav className={styles.nav}>
            {!isAdmin && (
              <div className={styles.actions}>
                <Link 
                  to="/" 
                  className={`${styles.iconBtn} ${pathname === '/' ? styles.active : ''}`} 
                  title="Home"
                >
                  <Home size={22} />
                  <span className={styles.iconLabel}>Home</span>
                </Link>

                <Link 
                  to="/shop" 
                  className={`${styles.iconBtn} ${pathname.startsWith('/shop') ? styles.active : ''}`} 
                  title="Shop"
                >
                  <ShoppingBag size={22} />
                  <span className={styles.iconLabel}>Shop</span>
                </Link>

                <Link 
                  to="/info" 
                  className={`${styles.iconBtn} ${pathname === '/info' ? styles.active : ''}`} 
                  title="Store Info"
                >
                  <Info size={22} />
                  <span className={styles.iconLabel}>Info</span>
                </Link>

                {hasActiveOrder && (
                  <Link 
                    to="/track-order" 
                    className={`${styles.iconBtn} ${pathname === '/track-order' ? styles.active : ''} ${styles.trackBtn}`} 
                    title="Track Order"
                  >
                    <Truck size={22} />
                    <span className={styles.iconLabel}>Track</span>
                  </Link>
                )}

                <button className={styles.cartBtn} onClick={() => setIsOpen(true)} title="Cart">
                  <div className={styles.cartIconWrapper}>
                    <ShoppingCart size={22} />
                    {count > 0 && <span className={styles.badge}>{count}</span>}
                  </div>
                  <span className={styles.iconLabel}>Cart</span>
                </button>

                {isAuthenticated && (
                  <button onClick={() => setShowLogoutModal(true)} className={`${styles.iconBtn} ${styles.logoutBtnRed}`} title="Log Out">
                    <LogOut size={22} className={styles.logoutIcon} />
                    <span className={`${styles.iconLabel} ${styles.iconLabelRed}`}>Exit</span>
                  </button>
                )}
              </div>
            )}
          </nav>
        </div>
      </header>

      {showLogoutModal && (
        <LogoutModal 
          onConfirm={handleLogoutConfirm} 
          onCancel={() => setShowLogoutModal(false)} 
          isAdmin={isAdmin}
        />
      )}
    </>
  )
}
