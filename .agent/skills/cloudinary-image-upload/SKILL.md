# SKILL.md — Cloudinary Image Upload

Read this before building any image upload feature in the admin panel. This skill covers how the seller uploads product photos from their phone camera or gallery, how images are stored in Cloudinary, and how to serve them to buyers at the right size and quality.

---

## Overview

The seller (admin) uploads product images through the `ProductForm` in the admin panel. The upload flow uses **signed uploads** — the frontend asks the backend for a signed upload token, then uploads directly to Cloudinary from the browser. This keeps the Cloudinary API secret off the client entirely.

```
Admin taps image field on phone
        ↓
Phone shows: Camera / Gallery picker
        ↓
Admin selects or takes photo
        ↓
Frontend requests a signed upload URL from POST /api/admin/upload-signature
        ↓
Frontend uploads image directly to Cloudinary using the signed URL
        ↓
Cloudinary returns the image URL
        ↓
URL stored in ProductForm state → saved to Product.images[] on form submit
```

---

## Step 1 — Backend: Signed Upload Endpoint

Never expose `CLOUDINARY_API_SECRET` to the frontend. The backend generates a short-lived signed upload signature that the frontend uses to upload directly.

```js
// server/routes/admin.js (add this route)
import { v2 as cloudinary } from 'cloudinary'
import { authenticate } from '../middleware/authenticate.js'
import { adminOnly } from '../middleware/adminOnly.js'

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

// Returns a signed upload signature — admin only
router.post('/upload-signature', authenticate, adminOnly, (req, res) => {
  try {
    const timestamp = Math.round(Date.now() / 1000)

    const signature = cloudinary.utils.api_sign_request(
      {
        timestamp,
        folder: 'shukky-products', // All product images go into this Cloudinary folder
        upload_preset: undefined,
      },
      process.env.CLOUDINARY_API_SECRET
    )

    return res.json({
      success: true,
      data: {
        signature,
        timestamp,
        cloudName: process.env.CLOUDINARY_CLOUD_NAME,
        apiKey: process.env.CLOUDINARY_API_KEY,
      },
    })
  } catch (error) {
    console.error('[POST /admin/upload-signature]', error)
    return res.status(500).json({ success: false, message: 'Could not generate upload token' })
  }
})
```

---

## Step 2 — Frontend: Upload Hook

```js
// hooks/useImageUpload.js
import { useState } from 'react'
import api from '../lib/api'

export function useImageUpload() {
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState(null)

  async function uploadImage(file) {
    setIsUploading(true)
    setUploadError(null)

    try {
      // Step 1: Get signed upload credentials from our backend
      const { data } = await api.post('/admin/upload-signature')
      const { signature, timestamp, cloudName, apiKey } = data.data

      // Step 2: Upload directly to Cloudinary
      const formData = new FormData()
      formData.append('file', file)
      formData.append('signature', signature)
      formData.append('timestamp', timestamp)
      formData.append('api_key', apiKey)
      formData.append('folder', 'shukky-products')

      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
        { method: 'POST', body: formData }
      )

      if (!response.ok) {
        throw new Error('Image upload failed. Please try again.')
      }

      const result = await response.json()

      // Return the secure URL to be stored in the product's images array
      return result.secure_url
    } catch (error) {
      const message = error.message || 'Could not upload image. Try again.'
      setUploadError(message)
      return null
    } finally {
      setIsUploading(false)
    }
  }

  return { uploadImage, isUploading, uploadError }
}
```

---

## Step 3 — Frontend: Image Upload Input Component

```jsx
// components/admin/ImageUploader.jsx
import { useRef } from 'react'
import { Camera } from 'lucide-react'
import { useImageUpload } from '../../hooks/useImageUpload'
import styles from './ImageUploader.module.css'

export default function ImageUploader({ images = [], onChange }) {
  const fileInputRef = useRef(null)
  const { uploadImage, isUploading, uploadError } = useImageUpload()

  // 'accept' and 'capture' together trigger the native camera/gallery picker on mobile
  async function handleFileChange(e) {
    const file = e.target.files[0]
    if (!file) return

    const url = await uploadImage(file)
    if (url) {
      onChange([...images, url]) // Add new URL to the images array
    }

    // Reset input so the same file can be re-selected if needed
    e.target.value = ''
  }

  function handleRemove(index) {
    onChange(images.filter((_, i) => i !== index))
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.grid}>
        {images.map((url, index) => (
          <div key={url} className={styles.imageWrapper}>
            <img
              src={`${url}?w=200&q=auto&f=auto`}
              alt={`Product image ${index + 1}`}
              className={styles.image}
            />
            <button
              type="button"
              onClick={() => handleRemove(index)}
              className={styles.removeBtn}
              aria-label="Remove image"
            >
              ✕
            </button>
          </div>
        ))}

        {/* Add image button — hidden if 5 images already uploaded */}
        {images.length < 5 && (
          <button
            type="button"
            className={styles.addBtn}
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            aria-label="Add product image"
          >
            {isUploading ? (
              <span className={styles.uploading}>Uploading…</span>
            ) : (
              <>
                <Camera size={24} />
                <span>Add Photo</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Hidden native file input — triggers camera/gallery on mobile */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />

      {uploadError && <p className={styles.error}>{uploadError}</p>}
      <p className={styles.hint}>Tap to upload from your camera or gallery. Max 5 images.</p>
    </div>
  )
}
```

```css
/* components/admin/ImageUploader.module.css */
.wrapper { display: flex; flex-direction: column; gap: var(--space-2); }

.grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-2);
}

.imageWrapper {
  position: relative;
  border-radius: var(--radius-md);
  overflow: hidden;
  aspect-ratio: 1;
}

.image {
  width: 100%; height: 100%;
  object-fit: cover;
}

.removeBtn {
  position: absolute; top: var(--space-1); right: var(--space-1);
  width: 24px; height: 24px;
  background: rgba(10,10,10,0.7);
  color: #fff; border: none; border-radius: 50%;
  font-size: 11px; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
}

.addBtn {
  aspect-ratio: 1;
  border: 2px dashed var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  gap: var(--space-1); cursor: pointer;
  color: var(--color-muted); font-size: 12px; font-weight: 500;
  font-family: var(--font-body);
  transition: border-color 0.15s, color 0.15s;
}

.addBtn:hover { border-color: var(--color-accent); color: var(--color-accent); }
.addBtn:disabled { opacity: 0.5; cursor: not-allowed; }
.uploading { font-size: 12px; color: var(--color-muted); }

.error { font-size: 12px; color: var(--color-error); }
.hint { font-size: 12px; color: var(--color-muted); }
```

---

## Step 4 — Using ImageUploader in ProductForm

```jsx
// components/admin/ProductForm.jsx (image section)
import ImageUploader from './ImageUploader'

export default function ProductForm({ onSubmit }) {
  const [form, setForm] = useState({
    name: '', price: '', description: '',
    category: '', stock: '',
    images: [], // Array of Cloudinary URLs
  })

  function handleImagesChange(newImages) {
    setForm(prev => ({ ...prev, images: newImages }))
  }

  // Validation: at least one image required before saving
  function validate() {
    if (form.images.length === 0) {
      return 'Please upload at least one product image.'
    }
    // ... other validations
    return null
  }

  return (
    <form onSubmit={handleSubmit}>
      {/* ... other fields ... */}

      <div className={styles.formGroup}>
        <label>Product Images *</label>
        <ImageUploader
          images={form.images}
          onChange={handleImagesChange}
        />
      </div>

      <Button type="submit">Save Product</Button>
    </form>
  )
}
```

---

## Serving Images to Buyers (Cloudinary Transformations)

Always append transformation parameters to the Cloudinary URL before displaying to buyers. Never serve the raw uploaded URL directly.

```js
// Product list / grid (small cards)
`${imageUrl}?w=400&q=auto&f=auto`

// Product detail page (full view)
`${imageUrl}?w=800&q=auto&f=auto`

// Cart thumbnails
`${imageUrl}?w=120&q=auto&f=auto`

// Admin thumbnail previews
`${imageUrl}?w=200&q=auto&f=auto`
```

These parameters:
- `w=` — resize to the right width (reduces file size)
- `q=auto` — Cloudinary auto-selects the best quality
- `f=auto` — serves WebP to browsers that support it, JPEG/PNG as fallback

---

## Environment Variables Required

```env
# Server only — never expose these to the client
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```

`CLOUDINARY_CLOUD_NAME` and `CLOUDINARY_API_KEY` are safe to use in frontend upload requests (they are public keys). `CLOUDINARY_API_SECRET` must never leave the server.

---

## Upload Rules

| Rule | Detail |
|---|---|
| Max images per product | 5 |
| Accepted formats | Images only — `accept="image/*"` |
| Upload method | Signed direct upload — API secret never exposed to client |
| Storage folder | `shukky-products` in Cloudinary |
| Minimum images to save | 1 — validate before form submission |
| Cover image | Always `product.images[0]` — first image is the cover |
| Display size | Always use Cloudinary URL params — never raw uploaded URL |
| Mobile upload | Native camera/gallery picker via `<input type="file" accept="image/*">` |

---

## Image Upload Checklist

- [ ] `POST /api/admin/upload-signature` protected with `authenticate` + `adminOnly`
- [ ] `CLOUDINARY_API_SECRET` never sent to the frontend
- [ ] `<input type="file" accept="image/*">` used — enables camera/gallery on mobile
- [ ] Upload shows a loading/uploading state while in progress
- [ ] Upload errors are shown inline — never silently fail
- [ ] At least 1 image required before product can be saved
- [ ] Images displayed with Cloudinary transformation params (`w=`, `q=auto`, `f=auto`)
- [ ] First image in the array (`images[0]`) used as the product cover image
- [ ] Admin can remove individual images before saving
