'use client'
// src/components/kyc/DocumentSelectStep.tsx

import { useState } from 'react'
import { ChevronRight, Globe, FileText, CreditCard, BookOpen } from 'lucide-react'
import type { StepProps } from './types'
import type { DocumentType } from '@/types'

const COUNTRIES = [
  'Afghanistan', 'Albania', 'Algeria', 'Andorra', 'Angola', 'Antigua and Barbuda',
  'Argentina', 'Armenia', 'Australia', 'Austria', 'Azerbaijan', 'Bahamas', 'Bahrain',
  'Bangladesh', 'Barbados', 'Belarus', 'Belgium', 'Belize', 'Benin', 'Bhutan',
  'Bolivia', 'Bosnia and Herzegovina', 'Botswana', 'Brazil', 'Brunei', 'Bulgaria',
  'Burkina Faso', 'Burundi', 'Cabo Verde', 'Cambodia', 'Cameroon', 'Canada',
  'Central African Republic', 'Chad', 'Chile', 'China', 'Colombia', 'Comoros',
  'Congo (DRC)', 'Congo (Republic)', 'Costa Rica', 'Croatia', 'Cuba', 'Cyprus',
  'Czech Republic', 'Denmark', 'Djibouti', 'Dominica', 'Dominican Republic',
  'Ecuador', 'Egypt', 'El Salvador', 'Equatorial Guinea', 'Eritrea', 'Estonia',
  'Eswatini', 'Ethiopia', 'Fiji', 'Finland', 'France', 'Gabon', 'Gambia',
  'Georgia', 'Germany', 'Ghana', 'Greece', 'Grenada', 'Guatemala', 'Guinea',
  'Guinea-Bissau', 'Guyana', 'Haiti', 'Honduras', 'Hungary', 'Iceland', 'India',
  'Indonesia', 'Iran', 'Iraq', 'Ireland', 'Israel', 'Italy', 'Jamaica', 'Japan',
  'Jordan', 'Kazakhstan', 'Kenya', 'Kiribati', 'Kuwait', 'Kyrgyzstan', 'Laos',
  'Latvia', 'Lebanon', 'Lesotho', 'Liberia', 'Libya', 'Liechtenstein', 'Lithuania',
  'Luxembourg', 'Madagascar', 'Malawi', 'Malaysia', 'Maldives', 'Mali', 'Malta',
  'Marshall Islands', 'Mauritania', 'Mauritius', 'Mexico', 'Micronesia', 'Moldova',
  'Monaco', 'Mongolia', 'Montenegro', 'Morocco', 'Mozambique', 'Myanmar', 'Namibia',
  'Nauru', 'Nepal', 'Netherlands', 'New Zealand', 'Nicaragua', 'Niger', 'Nigeria',
  'North Korea', 'North Macedonia', 'Norway', 'Oman', 'Pakistan', 'Palau',
  'Palestine', 'Panama', 'Papua New Guinea', 'Paraguay', 'Peru', 'Philippines',
  'Poland', 'Portugal', 'Qatar', 'Romania', 'Russia', 'Rwanda',
  'Saint Kitts and Nevis', 'Saint Lucia', 'Saint Vincent and the Grenadines',
  'Samoa', 'San Marino', 'Sao Tome and Principe', 'Saudi Arabia', 'Senegal',
  'Serbia', 'Seychelles', 'Sierra Leone', 'Singapore', 'Slovakia', 'Slovenia',
  'Solomon Islands', 'Somalia', 'South Africa', 'South Korea', 'South Sudan',
  'Spain', 'Sri Lanka', 'Sudan', 'Suriname', 'Sweden', 'Switzerland', 'Syria',
  'Taiwan', 'Tajikistan', 'Tanzania', 'Thailand', 'Timor-Leste', 'Togo', 'Tonga',
  'Trinidad and Tobago', 'Tunisia', 'Turkey', 'Turkmenistan', 'Tuvalu', 'Uganda',
  'Ukraine', 'United Arab Emirates', 'United Kingdom', 'United States', 'Uruguay',
  'Uzbekistan', 'Vanuatu', 'Vatican City', 'Venezuela', 'Vietnam', 'Yemen',
  'Zambia', 'Zimbabwe',
]

const DOC_TYPES: { type: DocumentType; label: string; desc: string; icon: typeof FileText; sides: string }[] = [
  { type: 'id_card', label: 'National ID Card', desc: 'Front & back required', icon: CreditCard, sides: '2 photos' },
  { type: 'driver_license', label: "Driver's License", desc: 'Front & back required', icon: FileText, sides: '2 photos' },
  { type: 'passport', label: 'Passport', desc: 'Main photo page only', icon: BookOpen, sides: '1 photo' },
]

export function DocumentSelectStep({ state, updateState, goToStep }: StepProps) {
  const [country, setCountry] = useState(state.country)
  const [docType, setDocType] = useState<DocumentType | null>(state.documentType)
  const [search, setSearch] = useState('')

  const canProceed = country && docType

  const handleNext = () => {
    updateState({ country, documentType: docType })
    goToStep('document_upload')
  }

  const filtered = COUNTRIES.filter(c =>
    c.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="animate-in">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-white mb-1">Select Document</h2>
        <p className="text-sm text-white/40">Choose your country and document type</p>
      </div>

      {/* Country */}
      <div className="mb-5">
        <label className="block text-xs text-white/50 font-semibold uppercase tracking-wider mb-2.5">
          Country of Issue
        </label>

        <div className="relative mb-2">
          <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={e => { setSearch(e.target.value); setCountry('') }}
            placeholder="Search country..."
            className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-brand-500/50 transition-all text-sm"
          />
        </div>

        {country && (
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs bg-brand-600/20 border border-brand-500/40 text-brand-300 px-3 py-1.5 rounded-full font-medium">
              ✓ {country}
            </span>
            <button
              onClick={() => { setCountry(''); setSearch('') }}
              className="text-xs text-white/30 hover:text-white/60 transition-colors"
            >
              Change
            </button>
          </div>
        )}

        {search && !country && (
          <div className="bg-surface-900 border border-white/10 rounded-xl overflow-hidden max-h-48 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="px-4 py-3 text-sm text-white/30 text-center">No countries found</div>
            ) : (
              filtered.map(c => (
                <button
                  key={c}
                  onClick={() => { setCountry(c); setSearch('') }}
                  className="w-full text-left px-4 py-2.5 text-sm text-white/80 hover:bg-white/5 hover:text-white transition-colors border-b border-white/5 last:border-0"
                >
                  {c}
                </button>
              ))
            )}
          </div>
        )}
      </div>

      {/* Document Type */}
      <div className="mb-8">
        <label className="block text-xs text-white/50 font-semibold uppercase tracking-wider mb-2.5">
          Document Type
        </label>
        <div className="space-y-2.5">
          {DOC_TYPES.map(({ type, label, desc, icon: Icon, sides }) => (
            <button
              key={type}
              onClick={() => setDocType(type)}
              className={`w-full flex items-center gap-4 p-4 rounded-xl border transition-all text-left
                ${docType === type
                  ? 'bg-brand-600/15 border-brand-500/50 ring-1 ring-brand-500/30'
                  : 'bg-white/3 border-white/8 hover:bg-white/6 hover:border-white/15'}`}
            >
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0
                ${docType === type ? 'bg-brand-600/30' : 'bg-white/8'}`}>
                <Icon className={`w-5 h-5 ${docType === type ? 'text-brand-400' : 'text-white/50'}`} />
              </div>
              <div className="flex-1">
                <p className={`text-sm font-semibold ${docType === type ? 'text-white' : 'text-white/80'}`}>{label}</p>
                <p className="text-xs text-white/40 mt-0.5">{desc}</p>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium
                ${docType === type ? 'bg-brand-600/30 text-brand-400' : 'bg-white/8 text-white/30'}`}>
                {sides}
              </span>
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={handleNext}
        disabled={!canProceed}
        className="w-full py-4 rounded-2xl bg-brand-600 hover:bg-brand-500 disabled:opacity-30 disabled:cursor-not-allowed text-white font-bold text-base transition-all flex items-center justify-center gap-2 group"
      >
        Continue
        <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
      </button>
    </div>
  )
}
