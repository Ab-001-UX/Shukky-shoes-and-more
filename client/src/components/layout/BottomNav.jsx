import { Link, useLocation } from 'react-router-dom'
import { Home, ShoppingBag, ShoppingCart, Info } from 'lucide-react'
import { useCartStore } from '../../store/cartStore'
import { useAuthStore } from '../../store/authStore'
import styles from './BottomNav.module.css'

export default function BottomNav() {
  const { pathname } = useLocation()
  const items = useCartStore(state => state.items)
  const cartCount = items.reduce((sum, i) => sum + i.quantity, 0)
  const { isAuthenticated } = useAuthStore()

  const navItems = [
    { label: 'Home', path: '/', icon: <Home size={22} /> },
    { label: 'Shop', path: '/shop', icon: <ShoppingBag size={22} /> },
    { label: 'Cart', path: '/cart', icon: <ShoppingCart size={22} />, badge: cartCount },
    { label: 'Info', path: '/info', icon: <Info size={22} /> },
  ]

  const activeIndex = navItems.findIndex(item => 
    pathname === item.path || (item.path !== '/' && pathname.startsWith(item.path))
  )

  // Hide bottom nav on admin or checkout routes
  if (pathname.startsWith('/admin') || pathname === '/checkout') {
    return null
  }

  return (
    <nav className={styles.bottomNav}>
      {/* Sliding Indicator Pill */}
      <div 
        className={styles.indicator} 
        style={{ 
          width: `calc(100% / ${navItems.length} - 8px)`,
          left: `calc((${activeIndex} * 100% / ${navItems.length}) + 4px)`
        }} 
      />

      {navItems.map((item, index) => {
        const isActive = activeIndex === index
        
        return (
          <Link
            key={item.label}
            to={item.path}
            className={`${styles.navItem} ${isActive ? styles.active : ''}`}
          >
            <div className={styles.iconWrapper}>
              {item.icon}
              {item.badge > 0 && (
                <span className={styles.badge}>{item.badge}</span>
              )}
            </div>
            <span className={styles.label}>{item.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
