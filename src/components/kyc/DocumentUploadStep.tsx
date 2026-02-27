'use client'
/**
 * DocumentUploadStep.tsx
 * Receives ocrFile from DocumentScanner and stores it in state
 * so OcrConfirmStep can use the greyscale version for Tesseract.
 */

import { useState } from 'react'
import { ChevronRight, CheckCircle, RefreshCw } from 'lucide-react'
import type { StepProps } from './types'
import DocumentScanner from './DocumentScanner'

type ScanSide = 'front' | 'back' | 'main'

interface SideStatus {
  url:     string | null
  ocrFile: File   | null
  done:    boolean
}

export function DocumentUploadStep({ state, updateState, goToStep, token }: StepProps) {
  const docType    = state.documentType ?? 'id_card'
  const isPassport = docType === 'passport'
  const sides: ScanSide[] = isPassport ? ['main'] : ['front', 'back']

  const [currentIdx, setCurrentIdx] = useState(0)
  const [status, setStatus] = useState<Record<ScanSide, SideStatus>>({
    front: { url: null, ocrFile: null, done: false },
    back:  { url: null, ocrFile: null, done: false },
    main:  { url: null, ocrFile: null, done: false },
  })
  const [resetKey, setResetKey] = useState(0)

  const currentSide = sides[currentIdx]
  const allDone     = sides.every(s => status[s].done)

  const sideLabels: Record<ScanSide, string> = {
    front: 'Front Side',
    back:  'Back Side',
    main:  'Photo Page',
  }

  const handleScanComplete = (url: string, ocrFile: File) => {
    setStatus(prev => ({
      ...prev,
      [currentSide]: { url, ocrFile, done: true },
    }))
    if (currentIdx < sides.length - 1) {
      setTimeout(() => setCurrentIdx(i => i + 1), 800)
    }
  }

  const handleRetake = (side: ScanSide) => {
    setStatus(prev => ({ ...prev, [side]: { url: null, ocrFile: null, done: false } }))
    setCurrentIdx(sides.indexOf(side))
    setResetKey(k => k + 1)
  }

  const handleNext = () => {
    // Store the OCR-optimised file in state for OcrConfirmStep
    const frontOcrFile = status['front'].ocrFile || status['main'].ocrFile || null
    updateState({ documentFrontFile: frontOcrFile, documentBackFile: status['back'].ocrFile })
    goToStep('ocr_confirm')
  }

  const docLabel = {
    id_card:        'ID Card',
    driver_license: "Driver's License",
    passport:       'Passport',
  }[docType]

  const SideProgress = () => (
    <div className="flex items-center gap-2 mb-4">
      {sides.map((s, i) => {
        const done   = status[s].done
        const active = i === currentIdx && !done
        return (
          <div key={s} className="flex items-center gap-2 flex-1">
            <div className={`flex items-center gap-1.5 flex-1 py-2 px-3 rounded-xl border text-xs font-semibold transition-all
              ${done   ? 'bg-green-500/10 border-green-500/30 text-green-400' :
                active ? 'bg-brand-600/15 border-brand-500/40 text-brand-400' :
                         'bg-white/3 border-white/8 text-white/30'}`}>
              {done
                ? <CheckCircle className="w-3.5 h-3.5" />
                : <span className="w-3.5 h-3.5 rounded-full border border-current flex items-center justify-center text-[9px]">{i + 1}</span>
              }
              {sideLabels[s]}
              {done && (
                <button onClick={() => handleRetake(s)} className="ml-auto text-white/30 hover:text-white/60 transition-colors" title="Retake">
                  <RefreshCw className="w-3 h-3" />
                </button>
              )}
            </div>
            {i < sides.length - 1 && (
              <div className={`w-4 h-0.5 rounded-full flex-shrink-0 ${status[sides[i]].done ? 'bg-green-500/50' : 'bg-white/10'}`} />
            )}
          </div>
        )
      })}
    </div>
  )

  return (
    <div className="animate-in">
      <div className="mb-5">
        <h2 className="text-xl font-bold text-white mb-1">Upload {docLabel}</h2>
        <p className="text-sm text-white/40">
          {isPassport ? 'Upload the main photo page' : 'Upload both sides clearly'}
        </p>
      </div>

      {sides.length > 1 && <SideProgress />}

      {!allDone ? (
        <DocumentScanner
          key={`${currentSide}-${resetKey}`}
          token={token}
          side={currentSide}
          documentType={docType}
          onComplete={handleScanComplete}
          onError={(msg) => console.error('Upload error:', msg)}
        />
      ) : (
        <div className="animate-in space-y-3">
          <div className="glass rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle className="w-5 h-5 text-green-400" />
              <span className="font-bold text-white text-sm">All sides uploaded</span>
            </div>
            <div className="space-y-3">
              {sides.map(s => status[s].url && (
                <div key={s} className="relative rounded-xl overflow-hidden border border-green-500/25">
                  <img src={status[s].url!} alt={sideLabels[s]} className="w-full h-28 object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-2.5 flex items-center justify-between">
                    <span className="text-xs text-white font-semibold">{sideLabels[s]}</span>
                    <button
                      onClick={() => handleRetake(s)}
                      className="flex items-center gap-1 text-xs text-white/60 hover:text-white bg-black/40 rounded-lg px-2 py-1 transition-colors"
                    >
                      <RefreshCw className="w-3 h-3" />
                      Retake
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <button
            onClick={handleNext}
            className="w-full py-4 rounded-2xl bg-brand-600 hover:bg-brand-500 text-white font-bold text-base transition-all flex items-center justify-center gap-2 group"
          >
            Continue to Scan
            <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      )}
    </div>
  )
}
