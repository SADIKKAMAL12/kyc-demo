'use client'
/**
 * FaceMatchStep.tsx — manual review only, no face-api.js
 *
 * face-api.js is removed completely due to model shape incompatibilities.
 * The submission is sent straight to Supabase with status = 'manual_review'.
 * Admin reviews the document photo vs selfie in the dashboard.
 *
 * This step just shows a summary and submits.
 */

import { useState } from 'react'
import { CheckCircle, ChevronRight, Loader2, AlertCircle, ShieldCheck } from 'lucide-react'
import type { StepProps } from './types'

export function FaceMatchStep({ state, updateState, goToStep, token }: StepProps) {
  const [submitting, setSubmitting] = useState(false)
  const [error,      setError]      = useState<string | null>(null)

  const handleSubmit = async () => {
    setSubmitting(true)
    setError(null)

    try {
      const frontUrl  = sessionStorage.getItem('doc_front_url')
                     || sessionStorage.getItem('doc_main_url')
                     || ''
      const backUrl   = sessionStorage.getItem('doc_back_url') || null
      const selfieUrl = sessionStorage.getItem('selfie_url')   || ''

      console.log('[KYC Submit] token:', token)
      console.log('[KYC Submit] frontUrl:', frontUrl)
      console.log('[KYC Submit] backUrl:', backUrl)
      console.log('[KYC Submit] selfieUrl:', selfieUrl)
      console.log('[KYC Submit] ocrData:', state.ocrData)
      console.log('[KYC Submit] documentType:', state.documentType)
      console.log('[KYC Submit] country:', state.country)
      console.log('[KYC Submit] kycRequestId:', state.kycRequest?.id)

      if (!frontUrl) throw new Error('Document image URL is missing. Please go back and re-upload your document.')
      if (!selfieUrl) throw new Error('Selfie URL is missing. Please go back and re-upload your selfie.')

      const body = {
        token,
        kyc_request_id:      state.kycRequest?.id,
        document_front_url:  frontUrl,
        document_back_url:   backUrl,
        selfie_url:          selfieUrl,
        face_match_score:    null,
        ocr_data_json:       state.ocrData,
        document_type:       state.documentType,
        country:             state.country,
        verification_status: 'pending',
      }

      console.log('[KYC Submit] Full body:', JSON.stringify(body, null, 2))

      const res  = await fetch('/api/kyc/submit', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
      })

      const data = await res.json()
      console.log('[KYC Submit] Response status:', res.status)
      console.log('[KYC Submit] Response data:', data)

      if (!res.ok) {
        throw new Error(data.error || data.message || `Server error (${res.status})`)
      }

      goToStep('complete')
    } catch (err: any) {
      console.error('[KYC Submit] Error:', err)
      setError(err.message || 'Submission failed. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const checks = [
    { label: 'Document uploaded',     done: !!(sessionStorage.getItem('doc_front_url') || sessionStorage.getItem('doc_main_url')) },
    { label: 'Details confirmed',     done: !!(state.ocrData?.name || state.ocrData?.dob || state.ocrData?.document_number) },
    { label: 'Selfie uploaded',       done: !!sessionStorage.getItem('selfie_url') },
    { label: 'Identity verification', done: false, pending: true },
  ]

  return (
    <div className="animate-in">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-white mb-1">Ready to Submit</h2>
        <p className="text-sm text-white/40">
          Your documents will be reviewed by our team
        </p>
      </div>

      {/* Summary card */}
      <div className="glass rounded-2xl p-5 mb-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-brand-600/20 border border-brand-500/30 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5 text-brand-400" />
          </div>
          <div>
            <p className="text-sm font-bold text-white">Verification Summary</p>
            <p className="text-xs text-white/40">All steps completed</p>
          </div>
        </div>

        <div className="space-y-3">
          {checks.map(({ label, done, pending }) => (
            <div key={label} className="flex items-center gap-3">
              <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0
                ${done    ? 'bg-green-500'
                : pending ? 'bg-brand-600/40 border border-brand-500/40'
                          : 'bg-red-500/30 border border-red-500/30'}`}>
                {done
                  ? <CheckCircle className="w-3 h-3 text-white" />
                  : pending
                    ? <span className="text-brand-400 text-[9px] font-bold">?</span>
                    : <AlertCircle className="w-3 h-3 text-red-400" />}
              </div>
              <span className={`text-sm ${done ? 'text-white' : pending ? 'text-white/50' : 'text-red-400'}`}>
                {label}
                {pending && <span className="text-xs text-brand-400/70 ml-1">(manual review)</span>}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Detected info */}
      {(state.ocrData?.name || state.ocrData?.dob) && (
        <div className="glass rounded-2xl p-4 mb-5">
          <p className="text-xs text-white/40 font-semibold uppercase tracking-wider mb-3">Detected Info</p>
          {state.ocrData?.name && (
            <div className="flex justify-between py-1.5 border-b border-white/5">
              <span className="text-xs text-white/40">Name</span>
              <span className="text-xs text-white font-medium">{state.ocrData.name}</span>
            </div>
          )}
          {state.ocrData?.dob && (
            <div className="flex justify-between py-1.5 border-b border-white/5">
              <span className="text-xs text-white/40">Date of Birth</span>
              <span className="text-xs text-white font-medium">{state.ocrData.dob}</span>
            </div>
          )}
          {state.ocrData?.document_number && (
            <div className="flex justify-between py-1.5">
              <span className="text-xs text-white/40">Document No.</span>
              <span className="text-xs text-white font-medium">{state.ocrData.document_number}</span>
            </div>
          )}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-start gap-2 text-sm text-red-400 bg-red-500/10 border border-red-500/25 rounded-xl px-4 py-3 mb-4">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold mb-0.5">Submission Error</p>
            <p className="text-xs text-red-400/80">{error}</p>
            <p className="text-xs text-white/30 mt-1">Check the browser console for details (F12 → Console)</p>
          </div>
        </div>
      )}

      <button
        onClick={handleSubmit}
        disabled={submitting}
        className="w-full py-4 rounded-2xl bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white font-bold text-base transition-all flex items-center justify-center gap-2"
      >
        {submitting
          ? <><Loader2 className="w-5 h-5 spinner" /> Submitting...</>
          : <>Submit for Review <ChevronRight className="w-5 h-5" /></>}
      </button>

      <p className="text-xs text-white/25 text-center mt-3">
        🔒 Your data is encrypted and securely stored
      </p>
    </div>
  )
}
