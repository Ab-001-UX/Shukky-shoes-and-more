import { useState } from 'react'
import { Upload, X } from 'lucide-react'
import api from '../../lib/api'
import styles from './ImageUploader.module.css'

export default function ImageUploader({ images, onChange }) {
  const [isUploading, setIsUploading] = useState(false)

  const handleUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    setIsUploading(true)
    try {
      const { data } = await api.get('/admin/cloudinary-signature')
      const { timestamp, signature, apiKey, cloudName } = data.data

      const formData = new FormData()
      formData.append('file', file)
      formData.append('timestamp', timestamp)
      formData.append('signature', signature)
      formData.append('api_key', apiKey)

      const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: 'POST',
        body: formData
      })
      const result = await response.json()
      
      if (result.secure_url) {
        onChange([...images, result.secure_url])
      } else {
        throw new Error('Failed to upload image')
      }
    } catch (err) {
      alert(err.message || 'Error uploading image')
    } finally {
      setIsUploading(false)
      e.target.value = null
    }
  }

  const removeImage = (index) => {
    onChange(images.filter((_, i) => i !== index))
  }

  return (
    <div className={styles.uploader}>
      <div className={styles.previewGrid}>
        {images.map((img, idx) => (
          <div key={idx} className={styles.previewWrapper}>
            <img src={`${img}?w=150&q=auto&f=auto`} alt={`Preview ${idx}`} className={styles.previewImage} />
            <button type="button" onClick={() => removeImage(idx)} className={styles.removeBtn}>
              <X size={14} />
            </button>
          </div>
        ))}
        
        <label className={styles.uploadBtn}>
          <input 
            type="file" 
            accept="image/*" 
            onChange={handleUpload} 
            disabled={isUploading}
            style={{ display: 'none' }}
          />
          <Upload size={24} className={styles.uploadIcon} />
          <span>{isUploading ? 'Uploading...' : 'Upload Image'}</span>
        </label>
      </div>
    </div>
  )
}
