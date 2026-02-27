'use client'
/**
 * DocumentScanner.tsx
 *
 * File upload with preview.
 * - Original COLOR image is uploaded to Supabase (no modification)
 * - A separate greyscale copy is created in memory ONLY for Tesseract OCR
 * - The user always sees and submits the original color image
 */

import { useState, useRef, useCallback } from 'react'
import { Upload, X, CheckCircle, Loader2, AlertCircle, RefreshCw, FileImage } from 'lucide-react'

type UploadState = 'idle' | 'previewing' | 'uploading' | 'done' | 'error'

interface Props {
  token: string
  side: 'front' | 'back' | 'main'
  documentType: 'id_card' | 'driver_license' | 'passport'
  onComplete: (url: string, ocrFile: File) => void
  onError?: (msg: string) => void
}

/**
 * Resize image only (no color change) so large photos upload faster.
 * Returns original File if already small enough.
 */
async function resizeForUpload(file: File): Promise<File> {
  return new Promise((resolve) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      const MAX = 2000
      const scale = Math.min(1, MAX / Math.max(img.width, img.height))

      // Already small — return as-is, no canvas processing
      if (scale === 1) { resolve(file); return }

      const canvas = document.createElement('canvas')
      canvas.width  = Math.round(img.width  * scale)
      canvas.height = Math.round(img.height * scale)
      canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height)

      canvas.toBlob((blob) => {
        resolve(blob ? new File([blob], file.name, { type: 'image/jpeg' }) : file)
      }, 'image/jpeg', 0.92)
    }
    img.onerror = () => { URL.revokeObjectURL(url); resolve(file) }
    img.src = url
  })
}

/**
 * Create a greyscale + contrast-boosted version IN MEMORY ONLY for OCR.
 * This file is never uploaded — only passed to Tesseract.
 */
async function prepareForOCR(file: File): Promise<File> {
  return new Promise((resolve) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      // Scale up for better OCR resolution
      const scale = Math.max(1, 1400 / Math.max(img.width, img.height))
      const canvas = document.createElement('canvas')
      canvas.width  = Math.round(img.width  * scale)
      canvas.height = Math.round(img.height * scale)
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

      // Greyscale + contrast boost — for OCR accuracy only
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const d = imageData.data
      for (let i = 0; i < d.length; i += 4) {
        const grey     = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]
        const contrast = Math.min(255, Math.max(0, (grey - 128) * 1.5 + 128))
        d[i] = d[i + 1] = d[i + 2] = contrast
      }
      ctx.putImageData(imageData, 0, 0)

      canvas.toBlob((blob) => {
        resolve(blob ? new File([blob], 'ocr-' + file.name, { type: 'image/jpeg' }) : file)
      }, 'image/jpeg', 0.95)
    }
    img.onerror = () => { URL.revokeObjectURL(url); resolve(file) }
    img.src = url
  })
}

export default function DocumentScanner({ token, side, documentType, onComplete, onError }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)

  const [uploadState, setUploadState] = useState<UploadState>('idle')
  const [previewUrl,  setPreviewUrl]  = useState<string | null>(null)
  const [colorFile,   setColorFile]   = useState<File | null>(null)  // uploaded to Supabase
  const [ocrFile,     setOcrFile]     = useState<File | null>(null)  // used for OCR only
  const [dragging,    setDragging]    = useState(false)
  const [errorMsg,    setErrorMsg]    = useState<string | null>(null)
  const [preparing,   setPreparing]   = useState(false)

  const sideLabels: Record<string, string> = {
    front: 'Front Side',
    back:  'Back Side',
    main:  'Photo Page',
  }

  const handleFile = useCallback(async (raw: File) => {
    if (!raw.type.startsWith('image/')) {
      setErrorMsg('Please select an image file (JPG, PNG, HEIC, etc.)')
      return
    }
    setErrorMsg(null)

    // Show original color preview immediately
    const originalUrl = URL.createObjectURL(raw)
    setPreviewUrl(originalUrl)
    setUploadState('previewing')

    // Prepare both versions in parallel
    setPreparing(true)
    const [resized, ocr] = await Promise.all([
      resizeForUpload(raw),
      prepareForOCR(raw),
    ])
    setPreparing(false)

    setColorFile(resized) // color — goes to Supabase
    setOcrFile(ocr)       // greyscale — goes to Tesseract only
  }, [])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f) handleFile(f)
    e.target.value = ''
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const f = e.dataTransfer.files[0]
    if (f) handleFile(f)
  }, [handleFile])

  const handleUpload = async () => {
    if (!colorFile || !ocrFile) return
    setUploadState('uploading')
    setErrorMsg(null)

    try {
      // Upload the COLOR file to Supabase
      const formData = new FormData()
      formData.append('file',     colorFile)
      formData.append('token',    token)
      formData.append('fileType', side)

      const res  = await fetch('/api/kyc/upload', { method: 'POST', body: formData })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Upload failed')

      // Store URL for OCR step
      sessionStorage.setItem(`doc_${side}_url`, data.url)

      setUploadState('done')
      // Pass url + the OCR-optimised file to parent
      onComplete(data.url, ocrFile)
    } catch (err: any) {
      setErrorMsg(err.message)
      setUploadState('error')
      onError?.(err.message)
    }
  }

  const handleReset = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewUrl(null)
    setColorFile(null)
    setOcrFile(null)
    setUploadState('idle')
    setErrorMsg(null)
    setPreparing(false)
  }

  // ── Done ──────────────────────────────────────────────────────────────────
  if (uploadState === 'done') {
    return (
      <div className="flex flex-col items-center justify-center py-8 gap-3 text-center animate-in">
        <div className="w-14 h-14 rounded-2xl bg-green-500/15 border border-green-500/30 flex items-center justify-center">
          <CheckCircle className="w-7 h-7 text-green-400" />
        </div>
        <div>
          <p className="text-white font-bold text-sm">{sideLabels[side]} Uploaded</p>
          <p className="text-white/40 text-xs mt-1">Saved in full colour</p>
        </div>
        {previewUrl && (
          <img
            src={previewUrl}
            alt="uploaded"
            className="w-full max-h-36 object-cover rounded-xl border border-green-500/20 mt-1"
          />
        )}
      </div>
    )
  }

  // ── Preview + confirm ─────────────────────────────────────────────────────
  if (uploadState === 'previewing' || uploadState === 'uploading' || uploadState === 'error') {
    return (
      <div className="flex flex-col gap-3 animate-in">
        <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-black">
          {previewUrl && (
            <img
              src={previewUrl}
              alt="Document preview"
              className="w-full object-contain max-h-72"
            />
          )}
          {/* Status badge */}
          <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 bg-black/60 backdrop-blur-sm rounded-full px-2.5 py-1">
            {preparing ? (
              <>
                <Loader2 className="w-3 h-3 text-brand-400 spinner" />
                <span className="text-xs text-white/70">Preparing...</span>
              </>
            ) : (
              <>
                <CheckCircle className="w-3 h-3 text-green-400" />
                <span className="text-xs text-white/70">Full colour · Ready</span>
              </>
            )}
          </div>
          {uploadState !== 'uploading' && (
            <button
              onClick={handleReset}
              className="absolute top-2.5 right-2.5 p-1.5 rounded-xl bg-black/60 hover:bg-black/80 transition-all"
            >
              <X className="w-4 h-4 text-white" />
            </button>
          )}
        </div>

        {/* Quality checklist */}
        <div className="glass rounded-xl p-3.5 space-y-2">
          {[
            'All 4 corners of the document are visible',
            'Text and numbers are sharp and readable',
            'No glare or shadows covering details',
          ].map(item => (
            <div key={item} className="flex items-start gap-2">
              <CheckCircle className="w-3.5 h-3.5 text-green-400 flex-shrink-0 mt-0.5" />
              <span className="text-xs text-white/55">{item}</span>
            </div>
          ))}
        </div>

        {errorMsg && (
          <div className="flex items-center gap-2 text-sm text-red-400 bg-red-500/10 border border-red-500/25 rounded-xl px-4 py-3">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {errorMsg}
          </div>
        )}

        <div className="flex flex-col gap-2.5">
          <button
            onClick={handleReset}
            disabled={uploadState === 'uploading'}
            className="w-full py-3 rounded-xl border border-white/12 text-white/60 hover:text-white hover:border-white/25 transition-all text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-40"
          >
            <RefreshCw className="w-4 h-4" />
            Choose Different Image
          </button>
          <button
            onClick={handleUpload}
            disabled={uploadState === 'uploading' || preparing}
            className="w-full py-4 rounded-2xl bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white font-bold text-base transition-all flex items-center justify-center gap-2"
          >
            {uploadState === 'uploading' ? (
              <><Loader2 className="w-5 h-5 spinner" /> Uploading...</>
            ) : preparing ? (
              <><Loader2 className="w-5 h-5 spinner" /> Preparing...</>
            ) : (
              <><CheckCircle className="w-5 h-5" /> Use This Image</>
            )}
          </button>
        </div>
      </div>
    )
  }

  // ── Idle drop zone ────────────────────────────────────────────────────────
  return (
    <div className="animate-in">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleInputChange}
      />
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        className={`relative rounded-2xl border-2 border-dashed transition-all cursor-pointer
          flex flex-col items-center justify-center gap-4 py-12 px-6 text-center
          ${dragging
            ? 'border-brand-500/80 bg-brand-600/10'
            : 'border-white/15 hover:border-white/30 bg-white/2 hover:bg-white/4'}`}
      >
        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-all
          ${dragging ? 'bg-brand-600/25 border border-brand-500/40' : 'bg-white/6 border border-white/10'}`}>
          {dragging
            ? <Upload className="w-7 h-7 text-brand-400" />
            : <FileImage className="w-7 h-7 text-white/40" />}
        </div>
        <div>
          <p className="text-sm font-bold text-white mb-1">
            {dragging ? 'Drop to upload' : `Upload ${sideLabels[side]}`}
          </p>
          <p className="text-xs text-white/40 leading-relaxed">
            Tap to select from gallery · or drag &amp; drop<br />
            JPG, PNG, HEIC supported
          </p>
        </div>
        <div className="space-y-1.5 w-full text-left border-t border-white/8 pt-3">
          {[
            '📄 Place on a flat dark surface',
            '💡 Good lighting, no flash glare',
            '🔲 All 4 corners must be visible',
          ].map(tip => (
            <p key={tip} className="text-xs text-white/35">{tip}</p>
          ))}
        </div>
      </div>

      {errorMsg && (
        <div className="flex items-center gap-2 text-sm text-red-400 bg-red-500/10 border border-red-500/25 rounded-xl px-4 py-3 mt-3">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {errorMsg}
        </div>
      )}
    </div>
  )
}
