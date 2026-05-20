import { useState, useEffect, useCallback } from 'react'
import api from '../lib/api'

export function usePolicies() {
  const [policies, setPolicies] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchPolicies = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const { data } = await api.get('/policies')
      setPolicies(data.data)
    } catch (err) {
      setError('Could not load policies')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchPolicies()
  }, [fetchPolicies])

  return { policies, isLoading, error, refetch: fetchPolicies }
}
