'use client'
// src/app/kyc/verify/page.tsx

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import type { KYCState, KYCStep, KYCRequest } from '@/types'
import { StepIndicator } from '@/components/kyc/StepIndicator'
import { IntroStep } from '@/components/kyc/IntroStep'
import { DocumentSelectStep } from '@/components/kyc/DocumentSelectStep'
import { DocumentUploadStep } from '@/components/kyc/DocumentUploadStep'
import { OcrConfirmStep } from '@/components/kyc/OcrConfirmStep'
import { SelfieStep } from '@/components/kyc/SelfieStep'
import { FaceMatchStep } from '@/components/kyc/FaceMatchStep'
import { CompleteStep } from '@/components/kyc/CompleteStep'
import { ErrorScreen } from '@/components/kyc/ErrorScreen'
import { Shield, Loader2 } from 'lucide-react'

const STEPS: KYCStep[] = [
  'intro',
  'document_select',
  'document_upload',
  'ocr_confirm',
  'selfie',
  'face_match',
  'complete',
]

function KYCVerifyContent() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token')

  const [validating, setValidating] = useState(true)
  const [tokenError, setTokenError] = useState<string | null>(null)
  const [kycRequest, setKycRequest] = useState<KYCRequest | null>(null)

  const [state, setState] = useState<KYCState>({
    step: 'intro',
    kycRequest: null,
    country: '',
    documentType: null,
    documentFrontFile: null,
    documentBackFile: null,
    selfieFile: null,
    ocrData: null,
    faceMatchScore: null,
    livenessPass: false,
    error: null,
  })

  useEffect(() => {
    if (!token) {
      setTokenError('No verification token found. Please use the link provided to you.')
      setValidating(false)
      return
    }
    validateToken(token)
  }, [token])

  const validateToken = async (t: string) => {
    try {
      const res = await fetch(`/api/kyc/validate-token?token=${t}`)
      const data = await res.json()
      if (!res.ok) {
        setTokenError(data.error || 'Invalid verification link')
      } else {
        setKycRequest(data)
        setState(prev => ({ ...prev, kycRequest: data }))
      }
    } catch {
      setTokenError('Failed to validate your link. Please try again.')
    } finally {
      setValidating(false)
    }
  }

  const goToStep = (step: KYCStep) => {
    setState(prev => ({ ...prev, step }))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const updateState = (updates: Partial<KYCState>) => {
    setState(prev => ({ ...prev, ...updates }))
  }

  const currentStepIndex = STEPS.indexOf(state.step)

  if (validating) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center animate-in">
          <div className="w-14 h-14 rounded-2xl bg-brand-600/20 border border-brand-500/30 flex items-center justify-center mx-auto mb-4">
            <Loader2 className="w-7 h-7 text-brand-400 spinner" />
          </div>
          <p className="text-white/60 text-sm">Validating your link...</p>
        </div>
      </div>
    )
  }

  if (tokenError) {
    return <ErrorScreen message={tokenError} />
  }

  if (!kycRequest) {
    return <ErrorScreen message="Something went wrong. Please try your link again." />
  }

  const stepProps = { state, updateState, goToStep, token: token! }

  return (
    <div className="min-h-screen pb-10">
      {/* Background */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 right-0 w-80 h-80 rounded-full bg-brand-600/8 blur-3xl" />
        <div className="absolute bottom-0 -left-32 w-80 h-80 rounded-full bg-brand-800/8 blur-3xl" />
      </div>

      {/* Header */}
      <div className="sticky top-0 z-10 glass border-b border-white/8 px-4 py-3">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-brand-600/20 border border-brand-500/30 flex items-center justify-center flex-shrink-0">
            <Shield className="w-4 h-4 text-brand-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white truncate">Identity Verification</p>
            <p className="text-xs text-white/40 truncate">{kycRequest.email}</p>
          </div>
        </div>
      </div>

      {/* Step Indicator */}
      {state.step !== 'intro' && state.step !== 'complete' && (
        <div className="max-w-lg mx-auto px-4 pt-4">
          <StepIndicator currentStep={state.step} steps={STEPS.slice(1, -1)} />
        </div>
      )}

      {/* Step Content */}
      <div className="max-w-lg mx-auto px-4 pt-4">
        {state.step === 'intro' && <IntroStep {...stepProps} />}
        {state.step === 'document_select' && <DocumentSelectStep {...stepProps} />}
        {state.step === 'document_upload' && <DocumentUploadStep {...stepProps} />}
        {state.step === 'ocr_confirm' && <OcrConfirmStep {...stepProps} />}
        {state.step === 'selfie' && <SelfieStep {...stepProps} />}
        {state.step === 'face_match' && <FaceMatchStep {...stepProps} />}
        {state.step === 'complete' && <CompleteStep {...stepProps} />}
      </div>
    </div>
  )
}

export default function KYCVerifyPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-brand-400 spinner" />
      </div>
    }>
      <KYCVerifyContent />
    </Suspense>
  )
}
