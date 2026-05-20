import { useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'

const INACTIVITY_LIMIT_MS = 60 * 60 * 1000 // 1 hour

// Events that count as user activity
const ACTIVITY_EVENTS = [
  'mousemove',
  'mousedown',
  'keydown',
  'scroll',
  'touchstart',
  'click',
  'pointerdown',
]

export function useInactivityTimeout() {
  const isAuthenticated = useAuthStore(state => state.isAuthenticated)
  const logout = useAuthStore(state => state.logout)
  const navigate = useNavigate()
  const timerRef = useRef(null)

  const resetTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    
    // Persist activity to handle cross-session checks
    localStorage.setItem('shukky_last_activity', Date.now().toString())

    timerRef.current = setTimeout(async () => {
      // Session expired due to inactivity — log out silently
      await logout()
      localStorage.removeItem('shukky_last_activity')
      navigate('/login', { replace: true, state: { reason: 'inactivity' } })
    }, INACTIVITY_LIMIT_MS)
  }, [logout, navigate])

  useEffect(() => {
    // Only track activity when the user is logged in
    if (!isAuthenticated) return

    // Start the timer immediately
    resetTimer()

    // Reset timer on any user activity
    ACTIVITY_EVENTS.forEach(event => {
      window.addEventListener(event, resetTimer, { passive: true })
    })

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      ACTIVITY_EVENTS.forEach(event => {
        window.removeEventListener(event, resetTimer)
      })
    }
  }, [isAuthenticated, resetTimer])
}
