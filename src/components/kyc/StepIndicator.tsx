'use client'
// src/components/kyc/StepIndicator.tsx

import type { KYCStep } from '@/types'
import { Check } from 'lucide-react'

const STEP_LABELS: Partial<Record<KYCStep, string>> = {
  document_select: 'Document',
  document_upload: 'Upload',
  ocr_confirm: 'Confirm',
  selfie: 'Selfie',
  face_match: 'Match',
}

interface Props {
  currentStep: KYCStep
  steps: KYCStep[]
}

export function StepIndicator({ currentStep, steps }: Props) {
  const current = steps.indexOf(currentStep)

  return (
    <div className="flex items-center gap-1 mb-2">
      {steps.map((step, i) => {
        const isDone = i < current
        const isActive = i === current
        return (
          <div key={step} className="flex items-center flex-1">
            <div className="flex flex-col items-center flex-1">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all
                  ${isDone ? 'bg-green-500 text-white' : isActive ? 'bg-brand-600 text-white ring-2 ring-brand-500/40' : 'bg-white/10 text-white/30'}`}
              >
                {isDone ? <Check className="w-3 h-3" /> : <span>{i + 1}</span>}
              </div>
              <span className={`text-xs mt-1 font-medium transition-colors
                ${isDone ? 'text-green-400' : isActive ? 'text-brand-400' : 'text-white/25'}`}>
                {STEP_LABELS[step]}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className={`h-0.5 flex-1 mx-1 rounded-full transition-all mb-4 ${i < current ? 'bg-green-500/60' : 'bg-white/10'}`} />
            )}
          </div>
        )
      })}
    </div>
  )
}
