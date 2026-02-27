'use client'
/**
 * SelfieStep.tsx — upload only, no webcam, no liveness, no face-api
 * User picks a photo from their device. That's it.
 * Face matching is done manually by admin reviewing the submission.
 */

import { useState, useRef, useCallback } from 'react'
import { Upload, X, CheckCircle, Loader2, AlertCircle, RefreshCw, UserCircle2 } from 'lucide-react'
import type { StepProps } from './types'

export function SelfieStep({ state, updateState, goToStep, token }: StepProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  const [previewUrl,  setPreviewUrl]  = useState<string | null>(null)
  const [file,        setFile]        = useState<File | null>(null)
  const [uploading,   setUploading]   = useState(false)
  const [dragging,    setDragging]    = useState(false)
  const [error,       setError]       = useState<string | null>(null)

  const handleFile = useCallback((raw: File) => {
    if (!raw.type.startsWith('image/')) {
      setError('Please select an image file (JPG, PNG, HEIC, etc.)')
      return
    }
    setError(null)
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewUrl(URL.createObjectURL(raw))
    setFile(raw)
  }, [previewUrl])

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

  const handleReset = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewUrl(null)
    setFile(null)
    setError(null)
  }

  const handleNext = async () => {
    if (!file) return
    setUploading(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('file',     file)
      formData.append('token',    token)
      formData.append('fileType', 'selfie')

      const res  = await fetch('/api/kyc/upload', { method: 'POST', body: formData })
      const data = await res.json()

      if (!res.ok) throw new Error(data.error || `Upload failed (${res.status})`)

      sessionStorage.setItem('selfie_url', data.url)
      updateState({ selfieFile: file, livenessPass: false })
      goToStep('face_match')
    } catch (err: any) {
      console.error('Selfie upload error:', err)
      setError(err.message || 'Upload failed. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="animate-in">
      <div className="mb-5">
        <h2 className="text-xl font-bold text-white mb-1">Upload Selfie</h2>
        <p className="text-sm text-white/40">
          Upload a clear photo of your face for identity verification
        </p>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleInputChange}
      />

      {!file ? (
        /* ── Drop zone ── */
        <>
          <div
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            className={`rounded-2xl border-2 border-dashed transition-all cursor-pointer
              flex flex-col items-center justify-center gap-4 py-14 px-6 text-center
              ${dragging
                ? 'border-brand-500/80 bg-brand-600/10'
                : 'border-white/15 hover:border-white/30 bg-white/2 hover:bg-white/4'}`}
          >
            <div className={`w-20 h-20 rounded-full flex items-center justify-center transition-all
              ${dragging ? 'bg-brand-600/25 border-2 border-brand-500/50' : 'bg-white/6 border-2 border-white/10'}`}>
              {dragging
                ? <Upload className="w-9 h-9 text-brand-400" />
                : <UserCircle2 className="w-9 h-9 text-white/35" />}
            </div>
            <div>
              <p className="text-sm font-bold text-white mb-1">
                {dragging ? 'Drop your selfie here' : 'Upload a selfie'}
              </p>
              <p className="text-xs text-white/40 leading-relaxed">
                Tap to select from gallery · or drag &amp; drop<br />
                JPG, PNG, HEIC supported
              </p>
            </div>
          </div>

          {/* Tips */}
          <div className="glass rounded-xl p-4 mt-3 space-y-2">
            {[
              '😊 Face clearly visible and centred',
              '💡 Well lit — avoid dark backgrounds',
              '🚫 No sunglasses, hats or face coverings',
              '📸 Photo taken within the last 6 months',
            ].map(tip => (
              <p key={tip} className="text-xs text-white/40">{tip}</p>
            ))}
          </div>
        </>
      ) : (
        /* ── Preview ── */
        <div className="flex flex-col gap-3">
          <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-black">
            <img
              src={previewUrl!}
              alt="selfie preview"
              className="w-full object-contain max-h-80"
            />
            {!uploading && (
              <button
                onClick={handleReset}
                className="absolute top-2.5 right-2.5 p-1.5 rounded-xl bg-black/60 hover:bg-black/80 transition-all"
              >
                <X className="w-4 h-4 text-white" />
              </button>
            )}
          </div>

          {/* Checklist */}
          <div className="glass rounded-xl p-3.5 space-y-2">
            {[
              'Face is clearly visible and centred',
              'Good lighting, no harsh shadows',
              'No glasses, hats or obstructions',
            ].map(item => (
              <div key={item} className="flex items-start gap-2">
                <CheckCircle className="w-3.5 h-3.5 text-green-400 flex-shrink-0 mt-0.5" />
                <span className="text-xs text-white/55">{item}</span>
              </div>
            ))}
          </div>

          {error && (
            <div className="flex items-center gap-2 text-sm text-red-400 bg-red-500/10 border border-red-500/25 rounded-xl px-4 py-3">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <button
            onClick={handleReset}
            disabled={uploading}
            className="w-full py-3 rounded-xl border border-white/12 text-white/60 hover:text-white hover:border-white/25 transition-all text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-40"
          >
            <RefreshCw className="w-4 h-4" />
            Choose Different Photo
          </button>

          <button
            onClick={handleNext}
            disabled={uploading}
            className="w-full py-4 rounded-2xl bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white font-bold text-base transition-all flex items-center justify-center gap-2"
          >
            {uploading
              ? <><Loader2 className="w-5 h-5 spinner" /> Uploading...</>
              : <><CheckCircle className="w-5 h-5" /> Use This Photo</>}
          </button>
        </div>
      )}

      {error && !file && (
        <div className="flex items-center gap-2 text-sm text-red-400 bg-red-500/10 border border-red-500/25 rounded-xl px-4 py-3 mt-3">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}
    </div>
  )
}
