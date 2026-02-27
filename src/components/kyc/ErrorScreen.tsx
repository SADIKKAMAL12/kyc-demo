'use client'
// src/components/kyc/ErrorScreen.tsx

import { AlertTriangle, ArrowLeft } from 'lucide-react'

export function ErrorScreen({ message }: { message: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="text-center max-w-sm animate-in">
        <div className="w-16 h-16 rounded-2xl bg-red-500/15 border border-red-500/30 flex items-center justify-center mx-auto mb-5">
          <AlertTriangle className="w-8 h-8 text-red-400" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Verification Failed</h2>
        <p className="text-white/50 text-sm leading-relaxed">{message}</p>
        <p className="text-white/30 text-xs mt-6">
          If you believe this is an error, please contact the sender for a new link.
        </p>
      </div>
    </div>
  )
}
