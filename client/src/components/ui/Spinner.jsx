import styles from './Spinner.module.css'

export default function Spinner({ size = 'md', color = 'primary', className = '' }) {
  const spinnerClass = `${styles.spinner} ${styles[size]} ${styles[color]} ${className}`

  return (
    <div 
      className={spinnerClass} 
      role="status" 
      aria-label="loading"
    />
  )
}
