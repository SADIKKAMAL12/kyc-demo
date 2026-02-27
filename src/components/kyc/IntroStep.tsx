'use client'
// src/components/kyc/IntroStep.tsx

import { Shield, FileText, Camera, ScanFace, CheckCircle, ChevronRight } from 'lucide-react'
import type { StepProps } from './types'

export function IntroStep({ state, goToStep }: StepProps) {
  const { kycRequest } = state

  return (
    <div className="animate-in">
      {/* Hero */}
      <div className="text-center py-8">
        <div className="w-20 h-20 rounded-3xl bg-brand-600/20 border border-brand-500/30 flex items-center justify-center mx-auto mb-5 brand-glow">
          <Shield className="w-10 h-10 text-brand-400" />
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">Verify Your Identity</h1>
        <p className="text-white/50 text-sm leading-relaxed">
          Welcome, <span className="text-white font-medium">{kycRequest?.first_name} {kycRequest?.last_name}</span>.<br />
          This process takes about 3–5 minutes.
        </p>
      </div>

      {/* Steps overview */}
      <div className="glass rounded-2xl p-5 mb-5">
        <p className="text-xs text-white/40 font-semibold uppercase tracking-wider mb-4">What you'll need</p>
        <div className="space-y-3.5">
          {[
            { icon: FileText, title: 'Government ID', desc: 'Passport, ID card, or driver\'s license' },
            { icon: Camera, title: 'Document Photo', desc: 'Clear photo of your document' },
            { icon: ScanFace, title: 'Selfie with liveness', desc: 'Quick blink detection check' },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-brand-600/15 border border-brand-500/25 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Icon className="w-4 h-4 text-brand-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-white">{title}</p>
                <p className="text-xs text-white/40 mt-0.5">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Pre-filled info */}
      <div className="glass rounded-2xl p-5 mb-6">
        <p className="text-xs text-white/40 font-semibold uppercase tracking-wider mb-3">Your Details (Pre-filled)</p>
        <div className="space-y-2">
          {[
            { label: 'Name', value: `${kycRequest?.first_name} ${kycRequest?.last_name}` },
            { label: 'Email', value: kycRequest?.email },
          ].map(({ label, value }) => (
            <div key={label} className="flex justify-between items-center py-2 border-b border-white/5 last:border-0">
              <span className="text-xs text-white/40">{label}</span>
              <span className="text-sm text-white font-medium">{value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <button
        onClick={() => goToStep('document_select')}
        className="w-full py-4 rounded-2xl bg-brand-600 hover:bg-brand-500 text-white font-bold text-base transition-all flex items-center justify-center gap-2 group"
      >
        Start Verification
        <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
      </button>

      <p className="text-center text-xs text-white/25 mt-4">
        🔒 Your data is encrypted and securely stored
      </p>
    </div>
  )
}
