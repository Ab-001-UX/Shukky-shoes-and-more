import { useState } from 'react'
import { Upload, X, Link as LinkIcon, Plus } from 'lucide-react'
import api from '../../lib/api'
import { formatImageUrl } from '../../utils/formatImageUrl'
import styles from './ImageUploader.module.css'

export default function ImageUploader({ images, onChange }) {
  const [isUploading, setIsUploading] = useState(false)
  const [urlInput, setUrlInput] = useState('')

  const handleAddUrl = (e) => {
    e.preventDefault()
    if (!urlInput.trim()) return
    onChange([...images, urlInput.trim()])
    setUrlInput('')
  }

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
        throw new Error('Failed to upload image to Cloudinary')
      }
    } catch (err) {
      console.warn('Cloudinary upload failed/unconfigured, using local file reader fallback:', err.message)
      // Fallback: read file as base64 Data URI so adding images always succeeds
      const reader = new FileReader()
      reader.onload = (event) => {
        if (event.target.result) {
          onChange([...images, event.target.result])
        }
      }
      reader.readAsDataURL(file)
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
            <img src={formatImageUrl(img, 150)} alt={`Preview ${idx}`} className={styles.previewImage} />
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
          <span>{isUploading ? 'Uploading...' : 'Upload File'}</span>
        </label>
      </div>

      <div className={styles.urlForm}>
        <div className={styles.urlInputGroup}>
          <LinkIcon size={16} className={styles.urlIcon} />
          <input
            type="url"
            placeholder="Or paste image URL (e.g. Unsplash, web link)"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            className={styles.urlInput}
          />
          <button type="button" onClick={handleAddUrl} className={styles.urlAddBtn}>
            <Plus size={16} /> Add URL
          </button>
        </div>
      </div>
    </div>
  )
}
