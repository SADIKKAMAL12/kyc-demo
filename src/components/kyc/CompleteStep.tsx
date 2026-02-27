'use client'
// src/components/kyc/CompleteStep.tsx

import { CheckCircle, Shield, Clock } from 'lucide-react'
import type { StepProps } from './types'

export function CompleteStep({ state }: StepProps) {
  const isApproved = state.faceMatchScore !== null && state.faceMatchScore < 0.6

  return (
    <div className="animate-in min-h-[70vh] flex flex-col items-center justify-center text-center py-8">
      {/* Success icon */}
      <div className="relative mb-6">
        <div className="w-24 h-24 rounded-3xl bg-green-500/15 border border-green-500/30 flex items-center justify-center">
          <CheckCircle className="w-12 h-12 text-green-400" />
        </div>
        <div className="absolute -inset-2 rounded-3xl border border-green-500/10 pulse-ring" />
      </div>

      <h1 className="text-2xl font-bold text-white mb-2">Verification Complete!</h1>
      <p className="text-white/50 text-sm mb-2">
        Thank you, <span className="text-white font-medium">{state.kycRequest?.first_name}</span>.
      </p>
      <p className="text-white/40 text-sm max-w-xs mb-8">
        Your identity verification has been submitted and is under review.
      </p>

      {/* Status card */}
      <div className="w-full max-w-xs glass rounded-2xl p-5 mb-6">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-white/40">Document Upload</span>
            <span className="text-xs text-green-400 flex items-center gap-1">
              <CheckCircle className="w-3 h-3" /> Complete
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-white/40">OCR Scan</span>
            <span className="text-xs text-green-400 flex items-center gap-1">
              <CheckCircle className="w-3 h-3" /> Complete
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-white/40">Liveness Check</span>
            <span className={`text-xs flex items-center gap-1 ${state.livenessPass ? 'text-green-400' : 'text-yellow-400'}`}>
              {state.livenessPass ? <><CheckCircle className="w-3 h-3" /> Passed</> : <><Clock className="w-3 h-3" /> Skipped</>}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-white/40">Face Match</span>
            <span className={`text-xs flex items-center gap-1 ${isApproved ? 'text-green-400' : 'text-yellow-400'}`}>
              {isApproved ? <><CheckCircle className="w-3 h-3" /> Verified</> : <><Clock className="w-3 h-3" /> Manual Review</>}
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 text-xs text-white/25">
        <Shield className="w-3.5 h-3.5" />
        <span>Secured by KYC Demo System</span>
      </div>
    </div>
  )
}
