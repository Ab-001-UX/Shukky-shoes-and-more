import styles from './Skeleton.module.css'

export default function Skeleton({ variant = 'rect', width, height, className = '', style = {} }) {
  const customStyle = {
    width: width || undefined,
    height: height || undefined,
    ...style
  }

  return (
    <div 
      className={`${styles.skeleton} ${styles[variant]} ${className}`} 
      style={customStyle} 
    />
  )
}
