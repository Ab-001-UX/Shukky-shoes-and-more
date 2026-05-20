import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { LayoutDashboard, Package, ShoppingCart, Archive, LogOut, Menu, X, ExternalLink } from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import LogoutModal from '../layout/LogoutModal'
import styles from './AdminHeader.module.css'

export default function AdminHeader() {
  const [isOpen, setIsOpen] = useState(false)
  const [showLogoutModal, setShowLogoutModal] = useState(false)
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const logout = useAuthStore(state => state.logout)

  const navItems = [
    { label: 'Dashboard', path: '/admin/dashboard', icon: <LayoutDashboard size={20} /> },
    { label: 'Orders', path: '/admin/orders', icon: <ShoppingCart size={20} /> },
    { label: 'Products', path: '/admin/products', icon: <Package size={20} /> },
    { label: 'Inventory', path: '/admin/inventory', icon: <Archive size={20} /> },
    { label: 'View Storefront', path: '/shop' },
  ]

  const closeSidebar = () => setIsOpen(false)

  const handleLogoutConfirm = async () => {
    await logout()
    setShowLogoutModal(false)
    navigate('/')
  }

  return (
    <>
      <div className={styles.mobileBar}>
        <button className={styles.menuBtn} onClick={() => setIsOpen(true)}>
          <Menu size={24} />
        </button>
        <span className={styles.mobileTitle}>Shukky Admin</span>
      </div>

      <div className={`${styles.sidebar} ${isOpen ? styles.open : ''}`}>
        <div className={styles.logo}>
          <Link to="/" onClick={closeSidebar}>Shukky Admin</Link>
          <button className={styles.closeBtn} onClick={closeSidebar}>
            <X size={24} />
          </button>
        </div>
        
        <nav className={styles.nav}>
          {navItems.map(item => (
            <Link
              key={item.path}
              to={item.path}
              onClick={closeSidebar}
              className={`${styles.navItem} ${pathname.startsWith(item.path) ? styles.active : ''}`}
            >
              {item.icon}
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>
        
        <div className={styles.footer}>
          <button onClick={() => setShowLogoutModal(true)} className={styles.logoutBtn}>
            <LogOut size={20} />
            <span>Logout</span>
          </button>
        </div>
      </div>

      {isOpen && <div className={styles.overlay} onClick={closeSidebar} />}

      {showLogoutModal && (
        <LogoutModal 
          onConfirm={handleLogoutConfirm} 
          onCancel={() => setShowLogoutModal(false)} 
          isAdmin={true}
        />
      )}
    </>
  )
}
