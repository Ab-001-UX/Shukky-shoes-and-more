import { useEffect, useState } from 'react'
import { useAuthStore } from '../../store/authStore'
import Spinner from '../ui/Spinner'
import styles from './AppLoadingScreen.module.css'

export default function AppLoadingScreen() {
  const checkAuth = useAuthStore(state => state.checkAuth)
  const [showRetry, setShowRetry] = useState(false)
  const [statusText, setStatusText] = useState('Initializing luxury store...')

  useEffect(() => {
    // If auth checking takes longer than 6 seconds, show a message and a retry button
    const timer = setTimeout(() => {
      setShowRetry(true)
      setStatusText('Taking longer than usual to connect. Please check your internet or retry.')
    }, 6000)

    return () => clearTimeout(timer)
  }, [])

  async function handleRetry() {
    setShowRetry(false)
    setStatusText('Reconnecting to store...')
    
    // Tiny delay to make the retry flow clear to the user
    setTimeout(async () => {
      try {
        await checkAuth()
      } catch (err) {
        setShowRetry(true)
        setStatusText('Failed to connect. Please try again.')
      }
    }, 600)
  }

  return (
    <div className={styles.container}>
      <div className={styles.overlay} />
      <div className={styles.content}>
        <div className={styles.brand}>
          <h1 className={styles.logo}>Shukky Shoes</h1>
          <p className={styles.tagline}>& More</p>
        </div>
        
        <div className={styles.loaderArea}>
          {!showRetry ? (
            <Spinner size="lg" color="accent" />
          ) : (
            <button onClick={handleRetry} className={styles.retryButton}>
              Retry Connection
            </button>
          )}
        </div>

        <p className={styles.statusMessage}>{statusText}</p>
      </div>
      <div className={styles.footer}>
        <p>© 2026 Shukky Shoes & More. All rights reserved.</p>
      </div>
    </div>
  )
}
