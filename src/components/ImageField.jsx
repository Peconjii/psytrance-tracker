import { useRef, useState } from 'react'
import { uploadImage } from '../api/backend.js'

// How big a picture is kept: a square photo or logo, or a flyer (the longer side)
const SIZES = { square: 600, flyer: 1200 }
const QUALITY = 0.85

// Draws the picture at most `max` pixels on its longer side and returns it as WebP (JPEG where the browser can't make
// WebP), so a phone photo of several MB is sent as about 100-300 KB
async function shrink(file, max) {
    const bitmap = await createImageBitmap(file)
    const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(bitmap.width * scale)
    canvas.height = Math.round(bitmap.height * scale)
    canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    bitmap.close()
    const as = (type) => new Promise(resolve => canvas.toBlob(resolve, type, QUALITY))
    const webp = await as('image/webp')
    return webp?.type === 'image/webp' ? webp : as('image/jpeg')
}

// A picture field: paste a link to a picture, or upload one from the device (it becomes a link to this site)
function ImageField({ id, label, value, onChange, kind = 'square', placeholder = 'https://…' }) {
    const fileInput = useRef(null)
    const [state, setState] = useState({ uploading: false, error: '' })
    const shown = /^https?:\/\/\S+$/.test(value.trim())

    const upload = async (file) => {
        if (!file) return
        if (!file.type.startsWith('image/')) {
            setState({ uploading: false, error: 'Pick a picture (JPEG, PNG or WebP).' })
            return
        }
        setState({ uploading: true, error: '' })
        try {
            onChange(await uploadImage(await shrink(file, SIZES[kind])))
            setState({ uploading: false, error: '' })
        } catch (err) {
            setState({ uploading: false, error: err.response?.data?.message || 'Could not upload the picture. Try another one.' })
        } finally {
            fileInput.current.value = ''
        }
    }

    return (
        <div>
            <label htmlFor={id} className="field-label">{label}</label>
            <div className={`image-field image-field--${kind}`}>
                {shown && <img className="image-field__preview" src={value.trim()} alt="" referrerPolicy="no-referrer" />}
                <div className="image-field__inputs">
                    <input id={id} type="url" className="field" maxLength={500} value={value} placeholder={placeholder}
                        onChange={(e) => onChange(e.target.value)} />
                    <div className="flex flex-wrap items-center gap-2">
                        <button type="button" className="btn" disabled={state.uploading} onClick={() => fileInput.current.click()}>
                            {state.uploading ? 'Uploading…' : '↑ Upload a picture'}
                        </button>
                        {shown && !state.uploading && (
                            <button type="button" className="btn btn--ghost" onClick={() => onChange('')}>Remove</button>
                        )}
                        <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp" hidden
                            aria-label={`${label}: upload a picture`} onChange={(e) => upload(e.target.files[0])} />
                    </div>
                    {state.error && <p className="notice m-0">{state.error}</p>}
                </div>
            </div>
        </div>
    )
}

export default ImageField
