'use client'
/**
 * OcrConfirmStep.tsx — local Tesseract OCR, improved extraction
 *
 * Uses the greyscale-optimised File passed from DocumentUploadStep.
 * Better name/DOB/docnum patterns, MRZ support, multiple PSM modes.
 */

import { useState, useEffect } from 'react'
import { Loader2, ScanLine, CheckCircle, ChevronRight, AlertCircle, Edit3 } from 'lucide-react'
import type { StepProps } from './types'
import type { OCRData } from '@/types'

export function OcrConfirmStep({ state, updateState, goToStep }: StepProps) {
  const [scanning,  setScanning]  = useState(true)
  const [ocrData,   setOcrData]   = useState<OCRData | null>(state.ocrData)
  const [progress,  setProgress]  = useState(0)
  const [statusMsg, setStatusMsg] = useState('Starting OCR...')
  const [error,     setError]     = useState<string | null>(null)
  const [editing,   setEditing]   = useState(false)
  const [editData,  setEditData]  = useState<OCRData>({ name: '', dob: '', document_number: '' })

  useEffect(() => { runOCR() }, [])

  const runOCR = async () => {
    setScanning(true)
    setError(null)
    setProgress(0)

    // Resolve image source — greyscale OCR file from state (set by DocumentUploadStep)
    const imgSource = state.documentFrontFile
    if (!imgSource) {
      const empty: OCRData = { name: '', dob: '', document_number: '' }
      setOcrData(empty)
      setEditData(empty)
      setError('No document image found. Please fill in the fields manually.')
      setScanning(false)
      return
    }

    try {
      const { createWorker } = await import('tesseract.js')

      const worker = await createWorker(['eng'], 1, {
        logger: (m: any) => {
          if (m.status === 'loading tesseract core')       setStatusMsg('Loading OCR engine...')
          if (m.status === 'initializing tesseract')       setStatusMsg('Initialising...')
          if (m.status === 'loading language traineddata') setStatusMsg('Loading language data...')
          if (m.status === 'initializing api')             setStatusMsg('Setting up scanner...')
          if (m.status === 'recognizing text') {
            const p = Math.round((m.progress ?? 0) * 100)
            setProgress(p)
            setStatusMsg(`Scanning document... ${p}%`)
          }
        },
      })

      // PSM 6 = assume a uniform block of text — best for full ID scans
      await worker.setParameters({
        tessedit_pageseg_mode:    '6' as any,
        preserve_interword_spaces: '1',
      })

      const { data: { text, confidence } } = await worker.recognize(imgSource)
      await worker.terminate()

      console.log('OCR raw:', text)
      console.log('OCR confidence:', confidence)

      const extracted = extractFields(text, state.documentType ?? 'id_card')
      setOcrData(extracted)
      setEditData(extracted)
      updateState({ ocrData: extracted })

      if (confidence < 25) {
        setError('Image quality is low — please review and correct the fields below.')
      } else if (!extracted.name) {
        setError('Name could not be detected automatically. Please fill it in using the Edit button.')
      }
    } catch (err: any) {
      console.error('OCR error:', err)
      const empty: OCRData = { name: '', dob: '', document_number: '' }
      setOcrData(empty)
      setEditData(empty)
      setError('OCR failed. Please fill in the fields manually using the Edit button.')
    } finally {
      setScanning(false)
    }
  }

  /**
   * Extract name, DOB, and document number from raw OCR text.
   * Handles MRZ lines, labelled fields, and positional heuristics.
   */
  const extractFields = (text: string, docType: string): OCRData => {
    const lines = text
      .split('\n')
      .map(l => l.trim())
      .filter(l => l.length > 1)

    // ── Name extraction ──────────────────────────────────────────────────

    let name = ''

    // 1. MRZ line — passport / TD1 / TD3 (contains <<)
    const mrzLine = lines.find(l => l.includes('<<'))
    if (mrzLine) {
      // Format: SURNAME<<GIVEN<NAME<...
      const namePart  = mrzLine.replace(/[^A-Z<]/g, '')
      const separator = namePart.indexOf('<<')
      if (separator > 0) {
        const surname = namePart.slice(0, separator)
        const given   = namePart.slice(separator + 2).split('<').filter(Boolean).join(' ')
        name = `${surname} ${given}`.trim()
      }
    }

    // 2. "Surname / Name / Given Name" labelled fields
    if (!name) {
      const labelPatterns = [
        /^(?:surname|last\s*name|nom)[:\s]+(.+)/i,
        /^(?:given\s*names?|first\s*name|pr[eé]nom)[:\s]+(.+)/i,
        /^(?:full\s*name|name|nom\s*complet)[:\s]+(.+)/i,
      ]
      for (const line of lines) {
        for (const pattern of labelPatterns) {
          const m = line.match(pattern)
          if (m && m[1].trim().length > 2) {
            name = m[1].trim()
            break
          }
        }
        if (name) break
      }
    }

    // 3. All-caps line of 2–4 words (typical on ID cards)
    if (!name) {
      for (const line of lines) {
        // Must be 2–4 capitalised words, each 2–20 chars, no digits
        if (/^[A-Z]{2,20}(\s[A-Z]{2,20}){1,3}$/.test(line) && !/</.test(line)) {
          // Exclude common non-name uppercase tokens
          const excluded = ['REPUBLIC', 'KINGDOM', 'STATES', 'NATIONAL', 'IDENTITY',
                            'DRIVING', 'LICENSE', 'LICENCE', 'DOCUMENT', 'PASSPORT',
                            'CARD', 'EXPIRY', 'ISSUED', 'VALIDITY', 'NATIONALITY']
          if (!excluded.some(ex => line.includes(ex))) {
            name = line
            break
          }
        }
      }
    }

    // ── Date of Birth extraction ─────────────────────────────────────────

    let dob = ''

    const dobPatterns: RegExp[] = [
      /\bDOB[:\s]+(\d{2}[\/\-\.]\d{2}[\/\-\.]\d{4})\b/i,
      /\b(?:date\s*of\s*birth|birth\s*date|n[eé]\s*le?)[:\s]+(\d{2}[\/\-\.]\d{2}[\/\-\.]\d{4})\b/i,
      /\b(?:date\s*of\s*birth|birth\s*date)[:\s]+(\d{1,2}\s+\w+\s+\d{4})\b/i,
      /\b(\d{2}[\/\-\.]\d{2}[\/\-\.]\d{4})\b/,
      /\b(\d{4}[\/\-\.]\d{2}[\/\-\.]\d{2})\b/,
      /\b(\d{2}\s+(?:JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)\s+\d{4})\b/i,
    ]

    for (const pattern of dobPatterns) {
      const m = text.match(pattern)
      if (m) { dob = m[1]; break }
    }

    // ── Document number extraction ───────────────────────────────────────

    let document_number = ''

    const excluded_words = ['REPUBLIC', 'KINGDOM', 'STATES', 'NATIONAL', 'IDENTITY',
                            'DRIVING', 'LICENSE', 'LICENCE', 'PASSPORT']

    const docPatterns: RegExp[] = [
      /(?:document\s*no?|id\s*no?|passport\s*no?|license\s*no?|card\s*no?)[.:\s]+([A-Z0-9]{6,15})/i,
      /\b([A-Z]{1,2}\d{6,8})\b/,
      /\b([A-Z0-9]{8,14})\b/,
    ]

    for (const pattern of docPatterns) {
      const m = text.match(pattern)
      if (m) {
        const candidate = m[1].toUpperCase()
        if (!excluded_words.some(w => candidate.includes(w)) && candidate.length >= 6) {
          document_number = candidate
          break
        }
      }
    }

    return {
      name:            name.replace(/[^A-Za-z\s\-']/g, '').trim(),
      dob:             dob.trim(),
      document_number: document_number.trim(),
      raw_text:        text.slice(0, 500),
    }
  }

  const handleConfirm = () => {
    updateState({ ocrData: editing ? editData : ocrData })
    goToStep('selfie')
  }

  // ── Scanning UI ───────────────────────────────────────────────────────────
  if (scanning) {
    return (
      <div className="animate-in">
        <div className="text-center py-12">
          <div className="w-20 h-20 rounded-2xl bg-brand-600/20 border border-brand-500/30 flex items-center justify-center mx-auto mb-5 relative">
            <ScanLine className="w-8 h-8 text-brand-400" />
            <div className="absolute inset-0 rounded-2xl border-2 border-brand-500/20 animate-ping"
                 style={{ animationDuration: '1.5s' }} />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Scanning Document</h2>
          <p className="text-sm text-white/40 mb-5">{statusMsg}</p>
          <div className="max-w-xs mx-auto">
            <div className="flex justify-between text-xs text-white/35 mb-1.5">
              <span>Progress</span><span>{progress}%</span>
            </div>
            <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-brand-600 to-brand-400 rounded-full transition-all duration-300"
                style={{ width: `${Math.max(4, progress)}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── Results UI ────────────────────────────────────────────────────────────
  return (
    <div className="animate-in">
      <div className="mb-5">
        <h2 className="text-xl font-bold text-white mb-1">Confirm Details</h2>
        <p className="text-sm text-white/40">Review and correct the extracted information</p>
      </div>

      {error && (
        <div className="flex items-start gap-2 text-sm text-yellow-400 bg-yellow-500/10 border border-yellow-500/25 rounded-xl px-4 py-3 mb-4">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <div className="glass rounded-2xl p-5 mb-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-400" />
            <span className="text-sm font-semibold text-white">Scan Complete</span>
          </div>
          <button
            onClick={() => setEditing(!editing)}
            className="flex items-center gap-1.5 text-xs text-brand-400 hover:text-brand-300 transition-colors"
          >
            <Edit3 className="w-3.5 h-3.5" />
            {editing ? 'Done' : 'Edit fields'}
          </button>
        </div>

        <div className="space-y-3">
          {([
            { label: 'Full Name',       key: 'name'            as keyof OCRData, placeholder: 'e.g. JOHN DOE' },
            { label: 'Date of Birth',   key: 'dob'             as keyof OCRData, placeholder: 'e.g. 15/03/1990' },
            { label: 'Document Number', key: 'document_number' as keyof OCRData, placeholder: 'e.g. AB1234567' },
          ] as { label: string; key: keyof OCRData; placeholder: string }[]).map(({ label, key, placeholder }) => (
            <div key={key}>
              <label className="block text-xs text-white/40 mb-1.5 font-medium">{label}</label>
              {editing ? (
                <input
                  type="text"
                  value={(editData[key] as string) || ''}
                  onChange={e => setEditData(prev => ({ ...prev, [key]: e.target.value }))}
                  placeholder={placeholder}
                  className="w-full px-3 py-2.5 bg-white/5 border border-brand-500/30 rounded-xl text-white text-sm focus:outline-none focus:border-brand-500/60 transition-all"
                />
              ) : (
                <div className="text-sm text-white font-medium bg-white/3 rounded-xl px-3 py-2.5 min-h-[42px] flex items-center">
                  {ocrData?.[key]
                    ? <span>{ocrData[key] as string}</span>
                    : <span className="text-white/25 italic text-xs">Not detected — click Edit to fill in</span>
                  }
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <button
        onClick={handleConfirm}
        className="w-full py-4 rounded-2xl bg-brand-600 hover:bg-brand-500 text-white font-bold text-base transition-all flex items-center justify-center gap-2 group"
      >
        Confirm & Continue
        <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
      </button>
    </div>
  )
}
