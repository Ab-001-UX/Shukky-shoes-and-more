import { useState, useEffect } from 'react'
import { Save, RefreshCw, ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'
import api from '../../lib/api'
import styles from './AdminPolicies.module.css'

export default function AdminPolicies() {
  const [policies, setPolicies] = useState({
    DELIVERY: '',
    RETURNS: '',
    GENERAL: ''
  })
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState(null)

  useEffect(() => {
    fetchPolicies()
  }, [])

  async function fetchPolicies() {
    setIsLoading(true)
    try {
      const { data } = await api.get('/policies')
      const pMap = {}
      data.data.forEach(p => {
        pMap[p.type] = p.content
      })
      setPolicies(prev => ({ ...prev, ...pMap }))
    } catch (err) {
      console.error('Fetch Policies Error:', err)
      setMessage({ type: 'error', text: 'Failed to load policies. Is the server running?' })
    } finally {
      setIsLoading(false)
    }
  }

  async function handleSave(type) {
    if (isSaving) return
    setIsSaving(true)
    setMessage(null)
    
    try {
      console.log(`Attempting to save ${type} policy...`)
      const response = await api.put(`/admin/policies/${type}`, { content: policies[type] })
      
      if (response.data.success) {
        setMessage({ type: 'success', text: `Success! ${type} policy has been updated.` })
        setTimeout(() => setMessage(null), 4000)
      } else {
        throw new Error(response.data.message || 'Unknown error')
      }
    } catch (err) {
      console.error('Save Policy Error:', err)
      const errorMsg = err.response?.data?.message || err.message || 'Database connection error'
      setMessage({ type: 'error', text: `Error: ${errorMsg}` })
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) return (
    <div className={styles.loadingWrapper}>
      <div className={styles.spinner}></div>
      <p>Loading policies...</p>
    </div>
  )

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Link to="/admin" className={styles.backBtn}><ArrowLeft size={20} /> Dashboard</Link>
        <h1>Manage Store Policies</h1>
      </header>

      {message && (
        <div className={`${styles.message} ${styles[message.type]}`}>
          {message.text}
        </div>
      )}

      <div className={styles.grid}>
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h2>Delivery Policy</h2>
            <button 
              onClick={() => handleSave('DELIVERY')} 
              disabled={isSaving} 
              className={styles.saveBtn}
            >
              <Save size={18} /> {isSaving ? 'Saving...' : 'Save'}
            </button>
          </div>
          <textarea 
            value={policies.DELIVERY} 
            onChange={(e) => setPolicies({...policies, DELIVERY: e.target.value})}
            className={styles.textarea}
            rows="10"
            placeholder="Write your delivery terms here..."
          />
        </div>

        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h2>Return & Exchange Policy</h2>
            <button 
              onClick={() => handleSave('RETURNS')} 
              disabled={isSaving} 
              className={styles.saveBtn}
            >
              <Save size={18} /> {isSaving ? 'Saving...' : 'Save'}
            </button>
          </div>
          <textarea 
            value={policies.RETURNS} 
            onChange={(e) => setPolicies({...policies, RETURNS: e.target.value})}
            className={styles.textarea}
            rows="10"
            placeholder="Write your return terms here..."
          />
        </div>

        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h2>General Terms & Security</h2>
            <button 
              onClick={() => handleSave('GENERAL')} 
              disabled={isSaving} 
              className={styles.saveBtn}
            >
              <Save size={18} /> {isSaving ? 'Saving...' : 'Save'}
            </button>
          </div>
          <textarea 
            value={policies.GENERAL} 
            onChange={(e) => setPolicies({...policies, GENERAL: e.target.value})}
            className={styles.textarea}
            rows="10"
            placeholder="Write your general terms here..."
          />
        </div>
      </div>
      
      <div className={styles.hint}>
        <RefreshCw size={14} /> Changes are visible to customers immediately after saving.
      </div>
    </div>
  )
}
