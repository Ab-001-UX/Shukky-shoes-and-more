import { ShieldAlert, X, Smile } from 'lucide-react'
import styles from './LogoutModal.module.css'

export default function LogoutModal({ onConfirm, onCancel, isAdmin }) {
  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <button onClick={onCancel} className={styles.closeBtn}><X size={24} /></button>
        
        <div className={styles.header}>
          {isAdmin ? <ShieldAlert className={styles.icon} size={48} /> : <Smile className={styles.icon} size={48} style={{ color: 'var(--color-accent)' }} />}
          <h2>{isAdmin ? 'Exit Admin Dashboard?' : 'Logging Out?'}</h2>
        </div>

        <div className={styles.content}>
          {isAdmin ? (
            <p className={styles.adminNote}>Make sure you've saved all changes to products and inventory before leaving.</p>
          ) : (
            <p style={{ textAlign: 'center', fontSize: '16px', color: 'var(--color-muted)', margin: 'var(--space-4) 0' }}>We'll miss you! We look forward to seeing you again next time. 😊</p>
          )}
        </div>

        <div className={styles.actions}>
          <button onClick={onCancel} className={styles.cancelBtn}>Stay Logged In</button>
          <button onClick={onConfirm} className={styles.confirmBtn}>Yes, Log Out</button>
        </div>
      </div>
    </div>
  )
}
