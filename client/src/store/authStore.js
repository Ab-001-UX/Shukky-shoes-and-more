import { create } from 'zustand'
import api from '../lib/api'

export const useAuthStore = create((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,

  checkAuth: async () => {
    try {
      // Cross-session inactivity check
      const lastActivity = localStorage.getItem('shukky_last_activity')
      const oneHour = 60 * 60 * 1000
      
      if (lastActivity && Date.now() - parseInt(lastActivity, 10) > oneHour) {
        // Session expired due to inactivity while closed
        await api.post('/auth/logout')
        localStorage.removeItem('shukky_last_activity')
        set({ user: null, isAuthenticated: false, isLoading: false })
        return
      }

      const { data } = await api.get('/auth/me')
      set({ user: data.data, isAuthenticated: true, isLoading: false })
    } catch {
      set({ user: null, isAuthenticated: false, isLoading: false })
    }
  },

  login: async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password })
    localStorage.setItem('shukky_last_activity', Date.now().toString())
    set({ user: data.data, isAuthenticated: true })
    return data.data
  },

  register: async (name, email, password) => {
    const { data } = await api.post('/auth/register', { name, email, password })
    localStorage.setItem('shukky_last_activity', Date.now().toString())
    set({ user: data.data, isAuthenticated: true })
    return data.data
  },

  logout: async () => {
    await api.post('/auth/logout')
    localStorage.removeItem('shukky_last_activity')
    set({ user: null, isAuthenticated: false })
  }
}))
