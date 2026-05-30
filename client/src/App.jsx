import { useEffect } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from './store/authStore'
import Home from './pages/Home'
import Shop from './pages/Shop'
import ProductDetail from './pages/ProductDetail'
import Cart from './pages/Cart'
import Checkout from './pages/Checkout'
import OrderConfirmation from './pages/OrderConfirmation'
import Login from './pages/Login'
import Register from './pages/Register'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import Contact from './pages/Contact'
import TrackOrder from './pages/TrackOrder'
import StoreInfo from './pages/StoreInfo'
import AdminRoute from './components/layout/AdminRoute'
import AdminDashboard from './pages/admin/AdminDashboard'
import AdminOrders from './pages/admin/AdminOrders'
import AdminProducts from './pages/admin/AdminProducts'
import AdminInventory from './pages/admin/AdminInventory'
import Welcome from './pages/Welcome'
import AdminPolicies from './pages/admin/AdminPolicies'
import Header from './components/layout/Header'
import BottomNav from './components/layout/BottomNav'
import CartDrawer from './components/cart/CartDrawer'
import Toast from './components/ui/Toast'
import AppLoadingScreen from './components/layout/AppLoadingScreen'
import { useInactivityTimeout } from './hooks/useInactivityTimeout'

export default function App() {
  const checkAuth = useAuthStore(state => state.checkAuth)
  const isLoading = useAuthStore(state => state.isLoading)
  const isAuthenticated = useAuthStore(state => state.isAuthenticated)
  const user = useAuthStore(state => state.user)

  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  // Auto-logout after 1 hour of inactivity
  useInactivityTimeout()

  const { pathname } = useLocation()

  if (isLoading) {
    return <AppLoadingScreen />
  }

  const isAdminRoute = pathname.startsWith('/admin')
  const isWelcomePage = pathname === '/welcome' || (pathname === '/' && !isAuthenticated)
  const isAuthPage = pathname === '/login' || pathname === '/register' || pathname === '/forgot-password' || pathname === '/reset-password'

  // Redirects unauthenticated users to /login for any protected page
  function ProtectedRoute({ children }) {
    if (!isAuthenticated) return <Navigate to='/welcome' replace />
    return children
  }

  return (
    <>
      {!isAdminRoute && !isWelcomePage && !isAuthPage && <Header />}
      <main style={{ flex: 1 }}>
        <Routes>
          {/* Public routes */}
          <Route path='/welcome' element={<Welcome />} />
          <Route path='/login' element={<Login />} />
          <Route path='/register' element={<Register />} />
          <Route path='/forgot-password' element={<ForgotPassword />} />
          <Route path='/reset-password' element={<ResetPassword />} />

          {/* Root route: Show Welcome if guest, otherwise Home */}
          <Route 
            path='/' 
            element={
              isAuthenticated 
                ? (user?.role === 'ADMIN' ? <Navigate to="/admin/dashboard" replace /> : <Home />)
                : <Welcome />
            } 
          />
          <Route path='/shop' element={<Shop />} />
          <Route path='/product/:id' element={<ProductDetail />} />
          <Route path='/cart' element={<Cart />} />
          <Route path='/checkout' element={<ProtectedRoute><Checkout /></ProtectedRoute>} />
          <Route path='/track-order' element={<TrackOrder />} />
          <Route path='/order-confirmation/:id' element={<OrderConfirmation />} />
          <Route path='/contact' element={<Contact />} />
          <Route path='/info' element={<StoreInfo />} />

          {/* Protected Admin Routes */}
          <Route element={<AdminRoute />}>
            <Route path='/admin/dashboard' element={<AdminDashboard />} />
            <Route path='/admin/orders' element={<AdminOrders />} />
            <Route path='/admin/products' element={<AdminProducts />} />
            <Route path='/admin/inventory' element={<AdminInventory />} />
            <Route path="/admin/policies" element={<AdminPolicies />} />
          </Route>
        </Routes>
      </main>
      {!isAdminRoute && !isWelcomePage && !isAuthPage && <BottomNav />}
      <CartDrawer />
      <Toast />
    </>
  )
}
